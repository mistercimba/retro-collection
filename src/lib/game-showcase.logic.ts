import type {KeepStatus,CollectionGame} from "@/lib/data/types";
import type {PhysicalCopyProfile,PhysicalComponentKey,PhysicalComponentState} from "@/lib/physical-copy-profile.logic";
import {libraryComponentState} from "@/lib/component-needs.logic";

export type ComponentPresentation={key:PhysicalComponentKey;label:string;state:PhysicalComponentState};

export function componentPresentation(
 game:Pick<CollectionGame,"media"|"box"|"manual">,
 profile:PhysicalCopyProfile,
):ComponentPresentation[] {
 return profile.components.map(part=>({
  key:part.key,label:part.label,
  state:libraryComponentState(game[part.key]),
 }));
}
export function completionSummary(
 parts:ComponentPresentation[],
 activeNeeds:number,
):{state:"complete"|"missing"|"unknown";label:string}{
 if(parts.some(part=>part.state==="no")||activeNeeds>0)return {state:"missing",label:activeNeeds>0?String(activeNeeds)+" peça(s) para completar":"Componentes em falta"};
 if(!parts.length||parts.some(part=>part.state==="unknown"))return {state:"unknown",label:"Completude por verificar"};
 return {state:"complete",label:"Componentes base confirmados"};
}
export function copyOwnershipLabel(status:KeepStatus):string{
 if(status==="Collection")return "NA MINHA COLEÇÃO";
 if(status==="Sell")return "PARA VENDER";
 if(status==="Sold")return "VENDIDO";
 return "ESTADO POR VERIFICAR";
}
