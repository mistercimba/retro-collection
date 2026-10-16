import type { AuditRecord, CollectionGame } from "@/lib/data/types";
import { savePhysicalAudit } from "@/lib/library-actions";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { CONDITION_OPTIONS, withExistingOption, type SelectOption } from "@/lib/collection-field-options";
import { PHYSICAL_AUDIT_FIELD_LIMITS, type PhysicalAuditField } from "@/lib/physical-audit.logic";

const AUDIT_STATUSES: SelectOption[] = [
  { value: "", label: "Ainda não confirmada" },
  { value: "Pending", label: "Pendente" },
  { value: "Needs review", label: "A verificar" },
  { value: "Confirmed", label: "Confirmada" },
];
const FUNCTIONAL_STATUSES: SelectOption[] = [
  { value: "", label: "Por confirmar" },
  { value: "Working", label: "Funciona" },
  { value: "Not working", label: "Não funciona" },
  { value: "Not tested", label: "Não testado" },
];
const COMPONENT_CONDITIONS: SelectOption[] = [
  { value: "", label: "Por confirmar" },
  ...CONDITION_OPTIONS,
  { value: "Not applicable", label: "Não aplicável" },
];

function InputField({
  name, label, value = "", placeholder = "", wide = false, inputMode,
}: {
  name: PhysicalAuditField; label: string; value?: string; placeholder?: string;
  wide?: boolean; inputMode?: "numeric";
}) {
  return <label className={wide ? "sm:col-span-2" : undefined}>
    <span className="field-label">{label}</span>
    <input name={name} defaultValue={value} maxLength={PHYSICAL_AUDIT_FIELD_LIMITS[name]} placeholder={placeholder} inputMode={inputMode} className="field-input" />
  </label>;
}

function SelectField({ name, label, value = "", options }: {
  name: PhysicalAuditField; label: string; value?: string; options: SelectOption[];
}) {
  return <label>
    <span className="field-label">{label}</span>
    <select name={name} defaultValue={value} className="field-input">
      {withExistingOption(options, value).map((option) =>
        <option key={option.value} value={option.value}>{option.label}</option>
      )}
    </select>
  </label>;
}

function LongField({ name, label, value = "", placeholder = "" }: {
  name: PhysicalAuditField; label: string; value?: string; placeholder?: string;
}) {
  return <label className="sm:col-span-2">
    <span className="field-label">{label}</span>
    <textarea name={name} defaultValue={value} maxLength={PHYSICAL_AUDIT_FIELD_LIMITS[name]} placeholder={placeholder} className="field-input min-h-20" />
  </label>;
}

/** Keep the everyday identification workflow small; legacy audit detail stays opt-in. */
export function PhysicalAuditEditor({ game }: { game: CollectionGame }) {
  const audit: AuditRecord | null = game.audit;
  return <details className="collection-panel p-4">
    <summary className="cursor-pointer text-sm font-black text-slate-900">Identificação da edição</summary>
    <form action={savePhysicalAudit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="collectionId" value={game.collectionId} />
      <InputField name="productCode" label="Código de produto" value={audit?.productCode} placeholder="Ex.: SLES-XXXXX" />
      <InputField name="ean" label="EAN / código de barras" value={audit?.ean} inputMode="numeric" />
      <InputField name="releaseMarket" label="País / mercado da edição" value={audit?.releaseMarket} placeholder="Ex.: Portugal" wide />

      <details className="rounded-xl border border-[#e2ddd2] bg-[#faf8f2] p-3 sm:col-span-2">
        <summary className="cursor-pointer text-xs font-bold text-slate-700">Mais detalhes (opcional)</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <SelectField name="auditStatus" label="Estado da auditoria" value={audit?.auditStatus} options={AUDIT_STATUSES} />
          <InputField name="auditDate" label="Data da auditoria" value={audit?.auditDate} placeholder="AAAA-MM-DD" />
          <InputField name="localizedTitle" label="Título impresso" value={audit?.localizedTitle} />
          <InputField name="observedLanguages" label="Idiomas observados" value={audit?.observedLanguages} />
          <SelectField name="functionalStatus" label="Funcionamento" value={audit?.functionalStatus} options={FUNCTIONAL_STATUSES} />
          <InputField name="packaging" label="Embalagem" value={audit?.packaging} />
          <SelectField name="mediaCondition" label="Disco / cartucho" value={audit?.mediaCondition} options={COMPONENT_CONDITIONS} />
          <SelectField name="labelCondition" label="Label" value={audit?.labelCondition} options={COMPONENT_CONDITIONS} />
          <SelectField name="boxCondition" label="Caixa" value={audit?.boxCondition} options={COMPONENT_CONDITIONS} />
          <SelectField name="manualCondition" label="Manual" value={audit?.manualCondition} options={COMPONENT_CONDITIONS} />
          <LongField name="evidenceBasis" label="Evidência" value={audit?.evidenceBasis} />
          <LongField name="sources" label="Fontes" value={audit?.sources} />
          <LongField name="auditNotes" label="Notas da auditoria" value={audit?.auditNotes} />
        </div>
      </details>

      <ActionSubmitButton pendingLabel="A guardar…" className="min-h-11 rounded-xl bg-[#17382e] px-4 text-sm font-black text-white sm:col-span-2">
        Guardar
      </ActionSubmitButton>
    </form>
  </details>;
}
