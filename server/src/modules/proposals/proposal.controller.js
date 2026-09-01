export function createProposalController({proposalService}){
  const respond=(response,request,data,status=200,meta={})=>response.status(status).json({data,meta:{requestId:request.id,...meta}});
  const context=(request)=>({requestId:request.id,idempotencyKey:request.idempotencyKey});
  return{
    submit:async(request,response)=>respond(response,request,{proposal:await proposalService.submit(request.auth.user._id,request.validated.params.gigId,request.validated.body,context(request))},201),
    mine:async(request,response)=>{const result=await proposalService.mine(request.auth.user._id,request.validated.query);respond(response,request,{proposals:result.proposals},200,{pagination:{nextCursor:result.nextCursor,hasMore:result.hasMore}})},
    get:async(request,response)=>respond(response,request,{proposal:await proposalService.get(request.auth.user._id,request.validated.params.proposalId)}),
    update:async(request,response)=>respond(response,request,{proposal:await proposalService.update(request.auth.user._id,request.validated.params.proposalId,request.validated.body,context(request))}),
    withdraw:async(request,response)=>respond(response,request,{proposal:await proposalService.withdraw(request.auth.user._id,request.validated.params.proposalId,request.validated.body,context(request))}),
    forGig:async(request,response)=>{const result=await proposalService.forGig(request.auth.user._id,request.validated.params.gigId,request.validated.query);respond(response,request,{proposals:result.proposals,gig:result.gig},200,{pagination:{nextCursor:result.nextCursor,hasMore:result.hasMore}})},
    decision:(action)=>async(request,response)=>respond(response,request,await proposalService.decide(request.auth.user._id,request.validated.params.proposalId,action,request.validated.body,context(request))),
  };
}
