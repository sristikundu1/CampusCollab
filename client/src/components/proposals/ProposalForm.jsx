import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '../FormField.jsx';

const schema=z.object({coverMessage:z.string().trim().min(20,'Write at least 20 characters').max(5000),budgetType:z.enum(['MATCH_GIG','FIXED','RANGE','UNPAID']),minAmount:z.string().optional(),maxAmount:z.string().optional(),currency:z.string().trim().optional(),proposedDuration:z.string().trim().max(120).optional(),availability:z.string().trim().max(300).optional()}).superRefine((value,context)=>{if(['FIXED','RANGE'].includes(value.budgetType)&&(!value.minAmount||Number(value.minAmount)<0))context.addIssue({code:'custom',path:['minAmount'],message:'Enter a valid amount'});if(value.budgetType==='RANGE'&&(!value.maxAmount||Number(value.maxAmount)<Number(value.minAmount)))context.addIssue({code:'custom',path:['maxAmount'],message:'Maximum must be at least the minimum'});if(['FIXED','RANGE'].includes(value.budgetType)&&value.currency?.length!==3)context.addIssue({code:'custom',path:['currency'],message:'Use a 3-letter currency code'})});
function toPayload(values,gigBudget){let proposedBudget;if(values.budgetType==='MATCH_GIG')proposedBudget=gigBudget;else if(values.budgetType==='UNPAID')proposedBudget={type:'UNPAID'};else proposedBudget={type:values.budgetType,minMinor:Math.round(Number(values.minAmount)*100),...(values.budgetType==='RANGE'?{maxMinor:Math.round(Number(values.maxAmount)*100)}:{}),currency:values.currency.toUpperCase()};return{coverMessage:values.coverMessage,proposedBudget,...(values.proposedDuration?{proposedDuration:values.proposedDuration}:{}),...(values.availability?{availability:values.availability}:{})}}

export function ProposalForm({gigBudget,initial,onSubmit,submitLabel='Submit proposal',busy=false}){
  const current=initial?.proposedBudget;const defaultType=current?(current.type==='UNPAID'?'UNPAID':current.type):'MATCH_GIG';
  const {register,handleSubmit,formState:{errors}}=useForm({resolver:zodResolver(schema),defaultValues:{coverMessage:initial?.coverMessage??'',budgetType:defaultType,minAmount:current?.minMinor!==undefined?String(current.minMinor/100):'',maxAmount:current?.maxMinor!==undefined?String(current.maxMinor/100):'',currency:current?.currency??gigBudget?.currency??'BDT',proposedDuration:initial?.proposedDuration??'',availability:initial?.availability??''}});
  return <form className="space-y-5" onSubmit={handleSubmit((values)=>onSubmit(toPayload(values,gigBudget)))} noValidate>
    <FormField id="coverMessage" label="Cover message" error={errors.coverMessage?.message}><textarea id="coverMessage" className="field min-h-36 resize-y" placeholder="Explain your approach, relevant experience, and why you are a strong fit." {...register('coverMessage')}/></FormField>
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="budgetType" label="Budget proposal" error={errors.budgetType?.message}><select id="budgetType" className="field" {...register('budgetType')}><option value="MATCH_GIG">Match gig budget</option><option value="FIXED">Fixed amount</option><option value="RANGE">Amount range</option><option value="UNPAID">Unpaid collaboration</option></select></FormField>
      <FormField id="proposalCurrency" label="Currency" error={errors.currency?.message}><input id="proposalCurrency" className="field uppercase" maxLength={3} {...register('currency')}/></FormField>
      <FormField id="proposalMinAmount" label="Minimum / fixed amount" error={errors.minAmount?.message}><input id="proposalMinAmount" className="field" type="number" min="0" step="0.01" {...register('minAmount')}/></FormField>
      <FormField id="proposalMaxAmount" label="Maximum amount" error={errors.maxAmount?.message}><input id="proposalMaxAmount" className="field" type="number" min="0" step="0.01" {...register('maxAmount')}/></FormField>
      <FormField id="proposedDuration" label="Proposed duration" error={errors.proposedDuration?.message}><input id="proposedDuration" className="field" placeholder="Example: 2 weeks" {...register('proposedDuration')}/></FormField>
      <FormField id="proposalAvailability" label="Availability" error={errors.availability?.message}><input id="proposalAvailability" className="field" placeholder="Example: 10 hours per week" {...register('availability')}/></FormField>
    </div>
    <button className="btn-primary w-full sm:w-auto" disabled={busy} type="submit">{submitLabel.startsWith('Save')?<Save size={17}/>:<Send size={17}/>} {busy?'Saving…':submitLabel}</button>
  </form>;
}
