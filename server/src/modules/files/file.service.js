import { createHash, randomUUID } from "node:crypto";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  RequestValidationError,
} from "../../errors/application-error.js";
import { Conversation } from "../messaging/conversation.model.js";
import { Attachment } from "./attachment.model.js";

const sameId = (left, right) => String(left) === String(right);
const q = async (query, { lean = false, select } = {}) => {
  let value = query;
  if (select && value?.select) value = value.select(select);
  if (lean && value?.lean) value = value.lean();
  return value;
};
const safeName = (value) =>
  value.replace(/[\u0000-\u001f\u007f"\\/]/g, "_").slice(0, 255);
const detectedType = (content) => {
  if (
    content.length >= 8 &&
    content.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
  )
    return "image/png";
  if (
    content.length >= 3 &&
    content[0] === 0xff &&
    content[1] === 0xd8 &&
    content[2] === 0xff
  )
    return "image/jpeg";
  return null;
};

const metadata = (attachment) => ({
  id: String(attachment._id),
  fileName: attachment.originalFileName,
  mediaType: attachment.mediaTypeDetected,
  sizeBytes: attachment.sizeBytes,
  url: `/api/v1/attachments/${attachment._id}/content`,
});

export function createFileService({
  AttachmentModel = Attachment,
  ConversationModel = Conversation,
} = {}) {
  async function conversationAccess(userId, conversationId, send = false) {
    const conversation = await q(ConversationModel.findById(conversationId));
    const participant = conversation?.participants?.find((item) =>
      sameId(item.userId, userId),
    );
    if (!conversation || !participant) throw new NotFoundError();
    if (
      send &&
      (conversation.status !== "OPEN" ||
        participant.status !== "ACTIVE" ||
        !participant.canSend)
    )
      throw new AuthorizationError(
        "CONVERSATION_READ_ONLY",
        "You cannot add attachments to this conversation.",
      );
    return conversation;
  }

  async function uploadMessageAttachment(userId, input) {
    await conversationAccess(userId, input.conversationId, true);
    const content = Buffer.from(input.dataBase64, "base64");
    if (!content.length || content.length > 80 * 1024)
      throw new RequestValidationError([
        {
          location: "body",
          path: "dataBase64",
          code: "file_size",
          message: "Image attachments must be 80 KB or smaller.",
        },
      ]);
    const mediaType = detectedType(content);
    if (!mediaType || mediaType !== input.mediaType)
      throw new RequestValidationError([
        {
          location: "body",
          path: "mediaType",
          code: "file_signature",
          message:
            "The file content does not match an allowed PNG or JPEG image.",
        },
      ]);
    const attachment = await AttachmentModel.create({
      uploaderId: userId,
      parentType: "MESSAGE",
      conversationId: input.conversationId,
      originalFileName: safeName(input.fileName),
      mediaTypeDeclared: input.mediaType,
      mediaTypeDetected: mediaType,
      sizeBytes: content.length,
      storageProvider: "MONGODB",
      storageKey: `message/${input.conversationId}/${randomUUID()}`,
      integrityHash: createHash("sha256").update(content).digest("hex"),
      scanStatus: "CLEAN",
      status: "AVAILABLE",
      availableAt: new Date(),
      content,
    });
    return metadata(attachment);
  }

  async function content(userId, attachmentId) {
    const attachment = await q(
      AttachmentModel.findOne({
        _id: attachmentId,
        status: "AVAILABLE",
        scanStatus: "CLEAN",
      }),
      { select: "+content +originalFileName" },
    );
    if (!attachment) throw new NotFoundError();
    if (attachment.parentType === "MESSAGE")
      await conversationAccess(userId, attachment.conversationId);
    else throw new NotFoundError();
    return {
      content: attachment.content,
      mediaType: attachment.mediaTypeDetected,
      fileName: safeName(attachment.originalFileName),
    };
  }

  async function remove(userId, attachmentId) {
    const result = await AttachmentModel.updateOne(
      {
        _id: attachmentId,
        uploaderId: userId,
        parentType: "MESSAGE",
        parentId: { $exists: false },
        status: "AVAILABLE",
      },
      {
        $set: { status: "REMOVED", removedAt: new Date() },
        $unset: { content: 1 },
        $inc: { version: 1 },
      },
      { runValidators: true },
    );
    if (!result.matchedCount) throw new NotFoundError();
  }

  async function assertMessageAttachments(
    userId,
    conversationId,
    attachmentIds,
    session,
  ) {
    if (!attachmentIds?.length) return [];
    const items = await AttachmentModel.find({
      _id: { $in: attachmentIds },
      uploaderId: userId,
      conversationId,
      parentType: "MESSAGE",
      parentId: { $exists: false },
      status: "AVAILABLE",
      scanStatus: "CLEAN",
    }).session(session);
    if (items.length !== new Set(attachmentIds.map(String)).size)
      throw new ConflictError(
        "INVALID_ATTACHMENT",
        "One or more attachments are unavailable.",
      );
    return items;
  }

  return {
    uploadMessageAttachment,
    content,
    remove,
    assertMessageAttachments,
  };
}

export { metadata as attachmentMetadata };
