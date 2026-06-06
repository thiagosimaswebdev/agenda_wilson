import React from "react";
import { VisitRequest, VisitStatus } from "../types";
import { Ship, Download, Printer, User, ShieldCheck, MapPin, X } from "lucide-react";

interface VirtualBadgeProps {
  request: VisitRequest;
  onClose?: () => void;
}

export function VirtualBadge({ request, onClose }: VirtualBadgeProps) {
  // Generate the QR Code URL using the official safe QR Server API based on the Request ID
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    request.id
  )}&color=003366`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* Printable Credential Area */}
      <div 
        id={`badge-card-${request.id}`}
        className="relative bg-white border-2 border-slate-350 shadow-2xl animate-fade-in transition-all overflow-hidden flex flex-col justify-between"
        style={{
          width: "325px",
          height: "520px",
          borderRadius: "16px",
          fontFamily: "'Inter', sans-serif"
        }}
      >
        {/* LANYARD HOLE PUNCH REGION (Standard ID Accessory Slot) */}
        <div className="bg-slate-100 flex flex-col items-center justify-center pt-3 pb-2 border-b border-slate-205 relative shrink-0">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-2.5 right-3 text-slate-450 hover:text-slate-700 transition-colors cursor-pointer print:hidden p-1 bg-white hover:bg-slate-200 rounded-full"
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Physically simulated lanyard hole */}
          <div className="w-11 h-3 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner opacity-80" title="Encaixe do Cordão / Lanyard Strap Hole">
            <span className="text-[6px] font-mono text-slate-500 tracking-tighter leading-none uppercase">WS</span>
          </div>
          
          <span className="text-[7.5px] font-mono font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">
            Passador de Cordão / Lanyard Insertion
          </span>
        </div>

        {/* WILSON SONS MAIN HEADER BAND */}
        <div className="bg-[#003366] text-white py-3 px-4 text-center relative flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="bg-[#F58220] p-1 rounded text-white shadow-xs">
              <Ship className="h-4 w-4" />
            </div>
            <div className="text-left font-display">
              <div className="font-extrabold tracking-tight text-sm leading-none uppercase">
                Wilson Sons
              </div>
              <span className="text-[7.5px] text-orange-400 font-mono font-bold uppercase tracking-wider">
                Operações Portuárias
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-mono font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
              Acesso Liberado
            </span>
          </div>
        </div>

        {/* ORANGE DIAGONAL ACCENT SPLIT LINE */}
        <div className="h-1 bg-[#F58220]"></div>

        {/* CREDENTIAL BODY */}
        <div className="p-4 flex-1 flex flex-col justify-between bg-white text-slate-800">
          
          {/* Visitor Frame containing Photo & Designation */}
          <div className="flex items-center gap-4 border-b border-dashed border-slate-200 pb-3 mt-1 shrink-0">
            {/* Professional Credential Photo Box */}
            <div className="relative w-24 h-28 bg-slate-100 rounded-lg overflow-hidden border-2 border-[#003366] shadow-sm flex items-center justify-center shrink-0">
              {request.visitorPhoto ? (
                <img 
                  src={request.visitorPhoto} 
                  alt={request.fullName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center p-2 text-slate-400 space-y-1">
                  <User className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-[8px] font-bold leading-tight uppercase font-mono">Sem Foto</p>
                </div>
              )}
              {/* Approved Strip Ribbon inside Photo */}
              <div className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[8px] font-mono font-bold py-0.5 uppercase tracking-wider text-center leading-none">
                SESMT ✓
              </div>
            </div>

            {/* Core credentials info */}
            <div className="text-left flex-1 min-w-0">
              <span className="text-[8.5px] font-mono font-bold text-orange-600 uppercase tracking-widest block mb-0.5">
                VISITANTE AUTORIZADO
              </span>
              <h3 className="font-display font-extrabold text-base text-[#003366] leading-tight uppercase truncate" title={request.fullName}>
                {request.fullName}
              </h3>
              <p className="text-xs text-slate-600 font-bold uppercase tracking-wide truncate">
                {request.organization}
              </p>
              
              <div className="mt-2 text-[9.5px] text-slate-500 font-mono space-y-0.5">
                <div>CPF: <strong className="text-slate-700">{request.cpf}</strong></div>
                <div>ID: <strong className="text-[#003360] font-bold">{request.id}</strong></div>
              </div>
            </div>
          </div>

          {/* QR Code and Instructions Segment */}
          <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-150 p-2.5 rounded-xl flex-1 my-2">
            <div className="shrink-0 bg-white p-1 border border-slate-200 rounded-lg shadow-2xs">
              <img 
                src={qrCodeUrl} 
                alt="QR Code de Agendamento" 
                className="w-24 h-24 border-0"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="text-left flex-1 space-y-1">
              <p className="text-[10px] font-bold text-[#003366] uppercase leading-none">LEITOR DE PORTARIA</p>
              <p className="text-[8px] text-slate-500 font-medium leading-tight">
                Instruções: Este QR Code é escaneado pelos leitores nas catracas físicas das guaritas. Mantenha visível no peito com cordão oficial.
              </p>
              <div className="bg-orange-50 border border-orange-150 px-1.5 py-0.5 rounded text-[8px] font-mono text-orange-700 inline-block font-semibold">
                VALIDADE: {request.scheduledDate.split("-").reverse().join("/")}
              </div>
            </div>
          </div>

          {/* Vital Safety Requirements Section for Physical Wear */}
          <div className="bg-slate-900 text-white rounded-lg p-2 text-left space-y-1 shrink-0">
            <div className="flex items-center gap-1 text-[8.5px] font-mono font-black text-[#F58220] uppercase border-b border-slate-800 pb-0.5">
              <ShieldCheck className="h-3 w-3 text-[#F58220]" />
              <span>NORMAS DE SEGURANÇA REQUERIDAS</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 text-[7.5px] text-slate-300 font-semibold leading-tight list-none uppercase">
              <div className="flex items-center gap-1">
                <span className="text-orange-500">•</span> CAPACETE PORTUÁRIO
              </div>
              <div className="flex items-center gap-1">
                <span className="text-orange-500">•</span> COLETE REFLETIVO
              </div>
              <div className="flex items-center gap-1">
                <span className="text-orange-500">•</span> CALÇADO DE FECHAMENTO
              </div>
              <div className="flex items-center gap-1">
                <span className="text-orange-500">•</span> TUTORIAL REVISADO
              </div>
            </div>
          </div>
        </div>

        {/* CREDENTIAL REAR STRIP / Wilson Sons Info Footer */}
        <div className="bg-slate-100 text-center py-2 border-t border-slate-200 shrink-0 text-[7.5px] font-mono text-slate-400 tracking-tight flex items-center justify-between px-4">
          <span>PORTAL DE SEGURANÇA INTEGRADO</span>
          <span className="font-bold text-[#003366]">WILSON SONS CO.</span>
        </div>
      </div>

      {/* Action Buttons for download / print */}
      <div className="mt-5 w-full max-w-[325px] grid grid-cols-2 gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-250 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
        >
          <Printer className="h-3.5 w-3.5" />
          Imprimir Crachá
        </button>
        <button
          onClick={() => {
            const link = document.createElement("a");
            link.href = qrCodeUrl;
            link.download = `QR_Code_Credencial_${request.id}.png`;
            link.target = "_blank";
            link.click();
          }}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#003366] hover:bg-[#002244] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
        >
          <Download className="h-3.5 w-3.5" />
          Baixar QR Code
        </button>
      </div>

      {/* Styled Printable Style Block for Real Credentials Size */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #badge-card-${request.id}, #badge-card-${request.id} * {
            visibility: visible !important;
          }
          #badge-card-${request.id} {
            position: absolute !important;
            left: 50% !important;
            top: 5cm !important;
            transform: translate(-50%, 0) !important;
            width: 85mm !important;
            height: 135mm !important;
            border: 1px solid #c0c0c0 !important;
            border-radius: 16px !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
