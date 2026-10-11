"use client";

import { CheckCircle2, Copy, Link2, Loader2, QrCode, Unlink } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatDateTime, formatDay, formatPercent, formatPrice, todayKey } from "@/core/lib/format";
import { observer } from "@/core/state/mobx";
import { Badge, Button, Card, Modal } from "@/core/ui/ui";
import { usePlatform } from "@/modules/platform/PlatformProvider";
import { CHARGE_STATE_LABEL, CHARGE_STATE_STYLE, chargeState, daysOverdue, type Charge } from "../domain/types";

export function ChargeBadge({ charge }: { charge: Charge }) {
  const state = chargeState(charge, todayKey());
  const late = daysOverdue(charge, todayKey());
  return <Badge className={CHARGE_STATE_STYLE[state]}>{CHARGE_STATE_LABEL[state]}{late ? ` · ${late}d` : ""}</Badge>;
}

/** Pagamento: PIX real do Mercado Pago quando ligado; senão, a simulação da demonstração. */
export const PayModal = observer(function PayModal({ chargeId, onClose }: { chargeId: string; onClose: () => void }) {
  const { payments } = usePlatform();
  return payments.enabled ? <PixModal chargeId={chargeId} onClose={onClose} /> : <SimulatedPayModal chargeId={chargeId} onClose={onClose} />;
});

/**
 * PIX do Mercado Pago: QR Code + copia e cola. A tela pergunta ao servidor a cada 5 s se já foi pago
 * (o servidor consulta o Mercado Pago); com o site publicado, o webhook também confirma sozinho.
 */
const PixModal = observer(function PixModal({ chargeId, onClose }: { chargeId: string; onClose: () => void }) {
  const platform = usePlatform();
  const { market: m, payments } = platform;
  const charge = m.charge(chargeId);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pay = charge?.payment;
  const live = !!pay && pay.status === "pending" && Date.parse(pay.expiresAt) > Date.now();
  const paid = charge?.status === "paid";

  const generate = async () => {
    setBusy(true);
    setError(await platform.startPix(chargeId));
    setBusy(false);
  };
  // Gera ao abrir (ou reaproveita o PIX ainda válido).
  useEffect(() => {
    if (!live && !paid) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!live || paid) return;
    const timer = window.setInterval(() => void platform.syncPix(chargeId), 5000);
    return () => window.clearInterval(timer);
  }, [live, paid, chargeId, platform]);
  useEffect(() => {
    if (paid) toast.success("Pagamento confirmado pelo Mercado Pago! A produção começou.");
  }, [paid]);

  if (!charge) return null;
  const copy = () => {
    void navigator.clipboard?.writeText(pay?.qrCode ?? "").catch(() => undefined);
    toast.success("Código PIX copiado. Cole no app do seu banco.");
  };
  return (
    <Modal onClose={onClose} title="Pagar com PIX" description={`${charge.description} · vence em ${formatDay(charge.dueDate)}`} footer={<Button variant="secondary" onClick={onClose}>{paid ? "Concluir" : "Fechar"}</Button>}>
      {payments.testMode && <p className="rounded-lg bg-amber-100 px-3 py-1.5 text-center text-caption font-semibold text-amber-900">AMBIENTE DE TESTE — nenhum valor real é cobrado</p>}
      {paid ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-green-50 p-6 text-center text-green-800">
          <CheckCircle2 className="size-12" />
          <p className="text-lg font-bold">Pagamento confirmado</p>
          <p className="text-small">{charge.paidAt ? formatDateTime(charge.paidAt) : ""} · {formatPrice(charge.amount)}</p>
        </div>
      ) : live && pay ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-gray-50 p-5 text-center">
          {pay.qrCodeBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/png;base64,${pay.qrCodeBase64}`} alt="QR Code do PIX" className="size-52 rounded-lg bg-white p-2" />
          ) : (
            <div className="flex size-40 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white text-gray-400"><QrCode className="size-16" /></div>
          )}
          <p className="text-3xl font-bold">{formatPrice(charge.amount)}</p>
          <p className="text-small text-gray-600">Abra o app do seu banco, escolha PIX e leia o QR Code — ou use o copia e cola.</p>
          <button onClick={copy} className="flex max-w-full items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-small font-semibold"><Copy className="size-4 flex-shrink-0" /> <span className="truncate">Copiar código PIX</span></button>
          <p className="flex items-center gap-2 text-caption text-gray-500"><Loader2 className="size-3.5 animate-spin" /> Aguardando o pagamento… a confirmação é automática. Vale até {formatDateTime(pay.expiresAt)}.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-gray-50 p-6 text-center">
          {busy ? <Loader2 className="size-8 animate-spin text-purple-500" /> : <QrCode className="size-10 text-gray-400" />}
          <p className="text-small text-gray-600">{busy ? "Gerando o PIX no Mercado Pago…" : (error ?? (pay && pay.status !== "pending" ? "O PIX anterior expirou ou foi recusado." : ""))}</p>
          {!busy && <Button onClick={() => void generate()}>Gerar novo PIX</Button>}
        </div>
      )}
      <div className="rounded-lg border border-purple-100 bg-purple-50 p-3 text-small text-purple-900">
        <p className="font-semibold">Como o valor é dividido</p>
        <p>Designer ({m.nameOf(charge.designerId)}): {formatPrice(charge.designerAmount)} · KreativeArt ({formatPercent(charge.platformFee / charge.amount)}): {formatPrice(charge.platformFee)}</p>
        {pay && <p className="mt-1 text-caption">{pay.split ? "Divisão automática pelo Mercado Pago: cada parte cai direto na conta de quem recebe." : "O PIX é recebido pela KreativeArt, que repassa a parte do designer."}</p>}
      </div>
    </Modal>
  );
});

/**
 * Modo demonstração (portfólio): sem credenciais do Mercado Pago, o fluxo é o mesmo do PIX real —
 * o cliente clica em pagar, a tela "envia" e "aguarda o retorno" e a cobrança é dada como aprovada.
 * A integração real (PixModal) liga sozinha quando MP_ACCESS_TOKEN for configurado no servidor.
 */
const SimulatedPayModal = observer(function SimulatedPayModal({ chargeId, onClose }: { chargeId: string; onClose: () => void }) {
  const platform = usePlatform();
  const { market: m, auth } = platform;
  const [step, setStep] = useState<"idle" | "sending" | "waiting" | "done">("idle");
  const charge = m.charge(chargeId);
  const designer = m.account(charge?.designerId);
  if (!charge || !auth.actor || !designer) return null;
  const pay = async () => {
    setStep("sending");
    await new Promise((r) => setTimeout(r, 1200));
    setStep("waiting");
    await new Promise((r) => setTimeout(r, 1500));
    const err = m.payCharge(charge.id, auth.actor!);
    if (err) {
      setStep("idle");
      return void toast.error(err);
    }
    await platform.flush(); // só mostra "confirmado" depois que o servidor gravou
    if (m.charge(charge.id)?.status !== "paid") {
      setStep("idle");
      return;
    }
    setStep("done");
    toast.success("Pagamento confirmado! A produção começou.");
  };
  return (
    <Modal onClose={onClose} title="Pagar com PIX" description={`${charge.description} · vence em ${formatDay(charge.dueDate)}`}
      footer={step === "done" ? <Button onClick={onClose}>Concluir</Button> : <>
        <Button variant="secondary" onClick={onClose} disabled={step !== "idle"}>Fechar</Button>
        <Button variant="success" onClick={() => void pay()} disabled={step !== "idle"}>{step === "idle" ? `Pagar ${formatPrice(charge.amount)} com PIX` : <><Loader2 className="size-4 animate-spin" /> Processando…</>}</Button>
      </>}>
      {step === "done" ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-green-50 p-6 text-center text-green-800">
          <CheckCircle2 className="size-12" />
          <p className="text-lg font-bold">Pagamento confirmado</p>
          <p className="text-small">{formatPrice(charge.amount)} · o designer já pode começar a produção</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-gray-50 p-5 text-center">
          <div className="flex size-40 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white text-gray-400">
            {step === "idle" ? <QrCode className="size-16" /> : <Loader2 className="size-12 animate-spin text-purple-500" />}
          </div>
          <p className="text-3xl font-bold">{formatPrice(charge.amount)}</p>
          <p className="text-small text-gray-600">
            {step === "sending" ? "Gerando o PIX no Mercado Pago…" : step === "waiting" ? "Aguardando a confirmação do pagamento…" : `Pagamento por PIX para ${designer.name} (designer), com a comissão da KreativeArt já descontada.`}
          </p>
        </div>
      )}
      <div className="rounded-lg border border-purple-100 bg-purple-50 p-3 text-small text-purple-900">
        <p className="font-semibold">Como o valor é dividido</p>
        <p>Designer: {formatPrice(charge.designerAmount)} · KreativeArt ({formatPercent(charge.platformFee / charge.amount)}): {formatPrice(charge.platformFee)}</p>
      </div>
      <p className="text-caption text-gray-500">Modo demonstração: a integração com o Mercado Pago está pronta e é ativada com as credenciais da KreativeArt; aqui o pagamento é aprovado automaticamente.</p>
    </Modal>
  );
});

/** Tabela de cobranças (cliente paga; designer e admin só acompanham). */
export const ChargesTable = observer(function ChargesTable({ charges, showClient, showDesigner }: { charges: Charge[]; showClient?: boolean; showDesigner?: boolean }) {
  const { market: m, auth } = usePlatform();
  const [paying, setPaying] = useState<string | null>(null);
  const role = auth.role;
  const sorted = [...charges].sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const withPayout = sorted.some((c) => c.payout);
  if (!sorted.length) return <p className="text-small text-gray-500">Nenhuma cobrança.</p>;
  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[560px] text-small">
          <thead className="bg-gray-50 text-left text-caption uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Descrição</th>
              {showClient && <th className="px-3 py-2">Cliente</th>}
              {showDesigner && <th className="px-3 py-2">Designer</th>}
              <th className="px-3 py-2">Vencimento</th>
              <th className="px-3 py-2 text-right">{role === "designer" ? "Você recebe" : "Valor"}</th>
              {role === "admin" && <th className="px-3 py-2 text-right">Comissão</th>}
              <th className="px-3 py-2">Situação</th>
              {role !== "client" && withPayout && <th className="px-3 py-2">Repasse ao designer</th>}
              {role === "client" && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-2">{c.description}</td>
                {showClient && <td className="px-3 py-2">{m.nameOf(c.clientId)}</td>}
                {showDesigner && <td className="px-3 py-2">{m.nameOf(c.designerId)}</td>}
                <td className="whitespace-nowrap px-3 py-2">{formatDay(c.dueDate)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">{formatPrice(role === "designer" ? c.designerAmount : c.amount)}</td>
                {role === "admin" && <td className="whitespace-nowrap px-3 py-2 text-right">{formatPrice(c.platformFee)}</td>}
                <td className="px-3 py-2"><ChargeBadge charge={c} /></td>
                {role !== "client" && withPayout && <td className="px-3 py-2"><PayoutCell charge={c} /></td>}
                {role === "client" && <td className="px-3 py-2 text-right">{c.status === "pending" && <Button size="sm" onClick={() => setPaying(c.id)}>Pagar</Button>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paying && <PayModal chargeId={paying} onClose={() => setPaying(null)} />}
    </>
  );
});

/** Situação do repasse: automático (split) ou feito/pendente pela KreativeArt. */
const PayoutCell = observer(function PayoutCell({ charge }: { charge: Charge }) {
  const { market: m, auth } = usePlatform();
  const p = charge.payout;
  if (!p) return <span className="text-caption text-gray-400">—</span>;
  if (p.mode === "split") return <Badge className="bg-green-100 text-green-800">Automático (Mercado Pago)</Badge>;
  if (p.status === "done") return <Badge className="bg-green-100 text-green-800">Repassado{p.doneAt ? ` · ${formatDay(p.doneAt.slice(0, 10))}` : ""}</Badge>;
  if (auth.role !== "admin") return <Badge className="bg-amber-100 text-amber-800">A receber da KreativeArt</Badge>;
  const designer = m.account(charge.designerId);
  return (
    <div className="space-y-1">
      <p className="text-caption text-gray-600">PIX {designer?.pixKeyType}: <strong>{designer?.pixKey ?? "—"}</strong></p>
      <Button size="sm" variant="secondary" onClick={() => {
        if (!window.confirm(`Confirmar que você já fez o PIX de ${formatPrice(charge.designerAmount)} para ${m.nameOf(charge.designerId)}?`)) return;
        const err = m.markPayoutDone(charge.id);
        if (err) return void toast.error(err);
        toast.success("Repasse registrado.");
      }}>Marcar repasse feito ({formatPrice(charge.designerAmount)})</Button>
    </div>
  );
});

/** Designer: conecta a conta Mercado Pago para receber direto (divisão automática). */
export const MercadoPagoCard = observer(function MercadoPagoCard() {
  const platform = usePlatform();
  const { auth, payments } = platform;
  const me = auth.account;
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("mp");
    if (status === "conectado") toast.success("Conta Mercado Pago conectada! Os próximos pagamentos serão divididos automaticamente.");
    if (status === "erro") toast.error("Não foi possível conectar a conta Mercado Pago. Tente de novo.");
    if (status === "indisponivel") toast.error("A conexão com o Mercado Pago ainda não está configurada pela KreativeArt.");
    if (status) window.history.replaceState(null, "", window.location.pathname);
  }, []);
  if (!me || !payments.enabled) return null;
  const mp = me.mercadoPago;
  return (
    <Card className="h-fit space-y-3 p-6">
      <h2 className="font-bold">Mercado Pago</h2>
      {mp ? (
        <>
          <p className="flex items-center gap-2 text-small text-green-700"><CheckCircle2 className="size-4" /> Conta conectada (ID {mp.userId}) desde {formatDay(mp.connectedAt.slice(0, 10))}.</p>
          <p className="text-small text-gray-600">Os clientes pagam por PIX e o Mercado Pago divide na hora: sua parte cai direto na sua conta e a comissão vai para a KreativeArt.</p>
          <Button variant="secondary" size="sm" onClick={async () => {
            if (!window.confirm("Desconectar? Os próximos pagamentos passam a cair na conta da KreativeArt, que repassa a sua parte.")) return;
            const err = await platform.disconnectMercadoPago();
            if (err) return void toast.error(err);
            toast.success("Conta desconectada.");
          }}><Unlink className="size-4" /> Desconectar</Button>
        </>
      ) : (
        <>
          <p className="text-small text-gray-600">Conecte sua conta Mercado Pago para receber sua parte <strong>na hora</strong>, direto do pagamento do cliente. Sem conectar, a KreativeArt recebe o PIX e repassa para a sua chave PIX.</p>
          {payments.oauth ? (
            <a href="/api/mp/connect" className="brand-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2 text-small font-semibold text-white"><Link2 className="size-4" /> Conectar Mercado Pago</a>
          ) : (
            <p className="text-caption text-amber-800">A conexão ainda não foi habilitada pela KreativeArt.</p>
          )}
        </>
      )}
    </Card>
  );
});
