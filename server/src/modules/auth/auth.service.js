import { randomUUID } from "node:crypto";
import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  RequestValidationError,
} from "../../errors/application-error.js";
import {
  generateOpaqueToken,
  hashOpaqueToken,
} from "../../lib/crypto/opaque-token.js";
import { hashPassword, verifyPassword } from "../../lib/crypto/password.js";
import { withTransaction } from "../../lib/mongo/transaction.js";
import { Profile } from "../profiles/profile.model.js";
import { University } from "../university/university.model.js";
import { UniversityAffiliation } from "../university/university-affiliation.model.js";
import { UniversityDomain } from "../university/university-domain.model.js";
import { Session } from "./session.model.js";
import { User } from "./user.model.js";
import { VerificationChallenge } from "./verification-challenge.model.js";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function publicUser(user, profile, affiliation) {
  return {
    id: String(user._id),
    email: user.email,
    status: user.status,
    capabilities: user.capabilities,
    profile: profile
      ? {
          displayName: profile.displayName,
          completionScore: profile.completionScore,
          isCompleteForApplications: profile.isCompleteForApplications,
        }
      : null,
    universityVerification: affiliation
      ? {
          status: affiliation.status,
          universityId: String(affiliation.universityId),
        }
      : null,
  };
}

export function createAuthService({ config, emailService }) {
  const secret = () => {
    if (!config.sessionSecret)
      throw new Error(
        "SESSION_SECRET is required for authentication operations",
      );
    return config.sessionSecret;
  };
  async function issueChallenge(userId, affiliationId, email, purpose) {
    const token = generateOpaqueToken();
    await VerificationChallenge.updateMany(
      { userId, purpose, status: "ISSUED" },
      { status: "SUPERSEDED", supersededAt: new Date() },
    );
    await VerificationChallenge.create({
      userId,
      affiliationId,
      purpose,
      tokenHash: hashOpaqueToken(token, secret()),
      destinationEmail: email,
      status: "ISSUED",
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + HOUR),
    });
    return token;
  }
  return {
    async register(input) {
      const domain = input.email.split("@")[1];
      const universityDomain = await UniversityDomain.findOne({
        domain,
        status: "ACTIVE",
      }).lean();
      if (
        !universityDomain ||
        !(await University.exists({
          _id: universityDomain.universityId,
          status: "ACTIVE",
        }))
      ) {
        throw new RequestValidationError([
          {
            location: "body",
            path: "email",
            code: "unsupported_university",
            message: "Use an email from a supported university.",
          },
        ]);
      }
      if (await User.exists({ email: input.email }))
        throw new ConflictError(
          "EMAIL_ALREADY_REGISTERED",
          "An account already exists for this email.",
        );
      const passwordHash = await hashPassword(input.password);
      const verificationRequired = config.requireEmailVerification;
      let result;
      await withTransaction(async (session) => {
        const [user] = await User.create(
          [
            {
              email: input.email,
              passwordHash,
              primaryExperience: input.primaryExperience,
              capabilities: ["STUDENT"],
              status: verificationRequired ? "PENDING_VERIFICATION" : "ACTIVE",
            },
          ],
          { session },
        );
        const [profile] = await Profile.create(
          [{ userId: user._id, displayName: input.name }],
          { session },
        );
        const [affiliation] = await UniversityAffiliation.create(
          [
            {
              userId: user._id,
              universityId: universityDomain.universityId,
              universityDomainId: universityDomain._id,
              email: input.email,
              status: "PENDING",
              isActive: true,
            },
          ],
          { session },
        );
        result = { user, profile, affiliation };
      });
      if (!verificationRequired) {
        return {
          message: "Account created. You can now sign in.",
          requiresEmailVerification: false,
        };
      }
      const token = await issueChallenge(
        result.user._id,
        result.affiliation._id,
        input.email,
        "UNIVERSITY_VERIFY",
      );
      await emailService.sendVerification(input.email, token);
      return {
        message:
          "Account created. Check your university email to verify your account.",
        requiresEmailVerification: true,
      };
    },
    async resendVerification(email) {
      if (!config.requireEmailVerification)
        return {
          message: "Email verification is disabled in this environment.",
        };
      const user = await User.findOne({
        email,
        status: { $in: ["PENDING_VERIFICATION", "ACTIVE"] },
      });
      if (user) {
        const affiliation = await UniversityAffiliation.findOne({
          userId: user._id,
          isActive: true,
          status: "PENDING",
        });
        if (affiliation)
          await emailService.sendVerification(
            email,
            await issueChallenge(
              user._id,
              affiliation._id,
              email,
              "UNIVERSITY_VERIFY",
            ),
          );
      }
      return {
        message:
          "If an eligible pending account exists, a verification email has been sent.",
      };
    },
    async verifyEmail(token) {
      const tokenHash = hashOpaqueToken(token, secret());
      const challenge = await VerificationChallenge.findOne({
        tokenHash,
        purpose: "UNIVERSITY_VERIFY",
        status: "ISSUED",
        expiresAt: { $gt: new Date() },
      });
      if (!challenge)
        throw new ConflictError(
          "INVALID_OR_EXPIRED_TOKEN",
          "The verification link is invalid or expired.",
        );
      await withTransaction(async (session) => {
        const consumed = await VerificationChallenge.updateOne(
          { _id: challenge._id, status: "ISSUED" },
          { status: "CONSUMED", consumedAt: new Date(), $inc: { version: 1 } },
          { session },
        );
        if (!consumed.modifiedCount)
          throw new ConflictError(
            "TOKEN_ALREADY_USED",
            "The verification link has already been used.",
          );
        await UniversityAffiliation.updateOne(
          { _id: challenge.affiliationId, status: "PENDING" },
          {
            status: "VERIFIED",
            verificationMethod: "EMAIL_LINK",
            verifiedAt: new Date(),
            verificationExpiresAt: new Date(Date.now() + 365 * DAY),
            $inc: { version: 1 },
          },
          { session },
        );
        await User.updateOne(
          { _id: challenge.userId, status: "PENDING_VERIFICATION" },
          {
            status: "ACTIVE",
            statusChangedAt: new Date(),
            $inc: { version: 1 },
          },
          { session },
        );
      });
      return { message: "Your university email has been verified." };
    },
    async login({ email, password, remember }) {
      const user = await User.findOne({ email }).select("+passwordHash");
      if (!user || !(await verifyPassword(password, user.passwordHash)))
        throw new AuthenticationError(
          "INVALID_CREDENTIALS",
          "Email or password is incorrect.",
        );
      const affiliation = await UniversityAffiliation.findOne({
        userId: user._id,
        isActive: true,
      });
      if (
        config.requireEmailVerification &&
        (user.status === "PENDING_VERIFICATION" ||
          affiliation?.status !== "VERIFIED")
      ) {
        throw new AuthorizationError(
          "EMAIL_VERIFICATION_REQUIRED",
          "Verify your university email before signing in.",
        );
      }
      if (
        !config.requireEmailVerification &&
        user.status === "PENDING_VERIFICATION"
      ) {
        user.status = "ACTIVE";
        user.statusChangedAt = new Date();
        user.version += 1;
      }
      if (user.status !== "ACTIVE")
        throw new AuthorizationError(
          "ACCOUNT_RESTRICTED",
          "This account cannot sign in.",
        );
      const rawToken = generateOpaqueToken();
      const expiresAt = new Date(
        Date.now() + (remember ? config.sessionTtlDays * DAY : DAY),
      );
      const session = await Session.create({
        userId: user._id,
        tokenHash: hashOpaqueToken(rawToken, secret()),
        familyId: randomUUID(),
        authMethod: "PASSWORD",
        issuedAt: new Date(),
        expiresAt,
      });
      user.lastLoginAt = new Date();
      await user.save();
      return { rawToken, expiresAt, user: await this.currentUser(user._id) };
    },
    async authenticate(rawToken) {
      if (!rawToken) throw new AuthenticationError();
      const session = await Session.findOne({
        tokenHash: hashOpaqueToken(rawToken, secret()),
        status: "ACTIVE",
        expiresAt: { $gt: new Date() },
      });
      if (!session)
        throw new AuthenticationError(
          "SESSION_EXPIRED",
          "Your session has expired.",
        );
      const user = await User.findById(session.userId);
      if (!user || user.status !== "ACTIVE")
        throw new AuthorizationError(
          "ACCOUNT_RESTRICTED",
          "This account cannot perform this action.",
        );
      if (config.requireEmailVerification) {
        const affiliation = await UniversityAffiliation.findOne({
          userId: user._id,
          isActive: true,
          status: "VERIFIED",
        });
        if (!affiliation)
          throw new AuthorizationError(
            "EMAIL_VERIFICATION_REQUIRED",
            "Verify your university email before continuing.",
          );
      }
      return { user, session };
    },
    async currentUser(userId) {
      const [user, profile, affiliation] = await Promise.all([
        User.findById(userId),
        Profile.findOne({ userId }),
        UniversityAffiliation.findOne({ userId, isActive: true }),
      ]);
      if (!user) throw new AuthenticationError();
      return publicUser(user, profile, affiliation);
    },
    async logout(sessionId) {
      await Session.updateOne(
        { _id: sessionId, status: "ACTIVE" },
        {
          status: "REVOKED",
          revokedAt: new Date(),
          revokeReason: "LOGOUT",
          $inc: { version: 1 },
        },
      );
    },
    async forgotPassword(email) {
      const user = await User.findOne({ email, status: "ACTIVE" });
      if (user)
        await emailService.sendPasswordReset(
          email,
          await issueChallenge(user._id, null, email, "PASSWORD_RESET"),
        );
      return {
        message: "If an active account exists, a reset email has been sent.",
      };
    },
    async resetPassword({ token, password }) {
      const challenge = await VerificationChallenge.findOne({
        tokenHash: hashOpaqueToken(token, secret()),
        purpose: "PASSWORD_RESET",
        status: "ISSUED",
        expiresAt: { $gt: new Date() },
      });
      if (!challenge)
        throw new ConflictError(
          "INVALID_OR_EXPIRED_TOKEN",
          "The reset link is invalid or expired.",
        );
      const passwordHash = await hashPassword(password);
      await withTransaction(async (session) => {
        const consumed = await VerificationChallenge.updateOne(
          { _id: challenge._id, status: "ISSUED" },
          { status: "CONSUMED", consumedAt: new Date(), $inc: { version: 1 } },
          { session },
        );
        if (!consumed.modifiedCount)
          throw new ConflictError(
            "TOKEN_ALREADY_USED",
            "The reset link has already been used.",
          );
        await User.updateOne(
          { _id: challenge.userId },
          {
            passwordHash,
            passwordChangedAt: new Date(),
            $inc: { securityVersion: 1, version: 1 },
          },
          { session },
        );
        await Session.updateMany(
          { userId: challenge.userId, status: "ACTIVE" },
          {
            status: "REVOKED",
            revokedAt: new Date(),
            revokeReason: "PASSWORD_RESET",
          },
          { session },
        );
      });
      return {
        message: "Password reset successfully. Sign in with your new password.",
      };
    },
  };
}
