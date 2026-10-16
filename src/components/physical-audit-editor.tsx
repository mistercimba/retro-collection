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

/** Observation-only editor: physical presence remains in the separate copy checklist. */
export function PhysicalAuditEditor({ game }: { game: CollectionGame }) {
  const audit: AuditRecord | null = game.audit;
  return <details className="collection-panel p-4">
    <summary className="cursor-pointer text-sm font-black text-slate-900">Editar auditoria física da cópia</summary>
    <p className="mt-2 text-xs leading-5 text-slate-600">
      Regista apenas o que observaste nesta cópia. Uma edição europeia no IGDB não confirma
      automaticamente o país, o código de produto nem os idiomas da tua edição física.
      A checklist de peças em falta é gerida separadamente.
    </p>
    <form action={savePhysicalAudit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="collectionId" value={game.collectionId} />
      <SelectField name="auditStatus" label="Estado da auditoria" value={audit?.auditStatus} options={AUDIT_STATUSES} />
      <InputField name="auditDate" label="Data da auditoria" value={audit?.auditDate} placeholder="AAAA-MM-DD ou data histórica" />
      <InputField name="localizedTitle" label="Título impresso na cópia" value={audit?.localizedTitle} />
      <InputField name="productCode" label="Código de produto / SKU" value={audit?.productCode} placeholder="Ex.: SLES-XXXXX" />
      <InputField name="ean" label="EAN / código de barras observado" value={audit?.ean} inputMode="numeric" placeholder="Transcrição por verificar" />
      <InputField name="releaseMarket" label="Mercado / país impresso" value={audit?.releaseMarket} placeholder="Ex.: Portugal / Reino Unido" />
      <InputField name="observedLanguages" label="Idiomas observados" value={audit?.observedLanguages} wide placeholder="Idiomas da capa, manual ou jogo; discrimina nas notas" />
      <SelectField name="functionalStatus" label="Funcionamento testado" value={audit?.functionalStatus} options={FUNCTIONAL_STATUSES} />
      <InputField name="packaging" label="Embalagem / sleeve" value={audit?.packaging} placeholder="Ex.: Caixa original PAL" />
      <SelectField name="mediaCondition" label="Condição do disco / cartucho" value={audit?.mediaCondition} options={COMPONENT_CONDITIONS} />
      <SelectField name="labelCondition" label="Condição da label" value={audit?.labelCondition} options={COMPONENT_CONDITIONS} />
      <SelectField name="boxCondition" label="Condição da caixa" value={audit?.boxCondition} options={COMPONENT_CONDITIONS} />
      <SelectField name="manualCondition" label="Condição do manual" value={audit?.manualCondition} options={COMPONENT_CONDITIONS} />
      <LongField name="evidenceBasis" label="Base da evidência" value={audit?.evidenceBasis} placeholder="O que verificaste fisicamente ou nas fotografias?" />
      <LongField name="sources" label="Fontes consultadas" value={audit?.sources} placeholder="Referências para confirmar a variante (opcional)" />
      <LongField name="auditNotes" label="Notas detalhadas da auditoria" value={audit?.auditNotes} placeholder="Observações adicionais, ressalvas e pontos ainda por confirmar" />
      <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
        O EAN é guardado como transcrição, não como validação externa. Só assinala
        “Confirmada” se tiveres verificado a cópia. Este formulário não muda a completude nem o preço automaticamente.
      </p>
      <ActionSubmitButton pendingLabel="A guardar auditoria…" className="min-h-11 rounded-xl bg-[#17382e] px-4 text-sm font-black text-white sm:col-span-2">
        Guardar auditoria física
      </ActionSubmitButton>
    </form>
  </details>;
}
