"use client";

import { CalendarDays, CheckCircle2, UserCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDay, formatMonth, formatPercent, formatPrice } from "@/core/lib/format";
import { observer } from "@/core/state/mobx";
import { Badge, Button, Card, Modal, SelectField, TextArea } from "@/core/ui/ui";
import { splitAmount } from "@/modules/billing/domain/types";
import { ChargesTable } from "@/modules/billing/components/BillingParts";
import { usePlatform } from "@/modules/platform/PlatformProvider";
import { ORDER_STATUS_LABEL, ORDER_STATUS_STYLE, planMonths, type Order, type OrderStatus } from "../domain/types";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={ORDER_STATUS_STYLE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}

export const OrderProgress = observer(function OrderProgress({ order }: { order: Order }) {
  const { market: m } = usePlatform();
  const jobs = m.jobs.filter((j) => j.orderId === order.id);
  if (!jobs.length) return null;
  const done = jobs.filter((j) => j.status === "delivered" || j.status === "approved").length;
  const pct = Math.round((done / jobs.length) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-caption text-gray-500"><span>{done} de {jobs.length} peças aprovadas/entregues</span><span>{pct}%</span></div>
      <div className="h-2 rounded-full bg-gray-100"><div className="brand-gradient h-2 rounded-full" style={{ width: `${pct}%` }} /></div>
    </div>
  );
});

/** Linha/cartão de pedido em listas. */
export const OrderRow = observer(function OrderRow({ order, onOpen, showClient, showDesigner }: { order: Order; onOpen: () => void; showClient?: boolean; showDesigner?: boolean }) {
  const { market: m } = usePlatform();
  return (
    <Card className="p-4 transition hover:shadow-md">
      <button onClick={onOpen} className="w-full space-y-3 text-left">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-caption font-semibold text-gray-500">{order.number} · {order.kind === "plan" ? "Plano mensal" : "Serviço avulso"}</p>
            <p className="text-lg font-bold">{order.title}</p>
            <p className="text-small text-gray-600">
              {showClient && `${m.nameOf(order.clientId)} · `}
              {showDesigner && (order.designerId ? `designer: ${m.nameOf(order.designerId)} · ` : "sem designer · ")}
              {order.kind === "plan" ? `${formatPrice(order.price)}/mês · ${order.months} meses` : formatPrice(order.price)}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <OrderProgress order={order} />
      </button>
    </Card>
  );
});

/** Detalhe do pedido; ações conforme o perfil. */
export const OrderDetailModal = observer(function OrderDetailModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { market: m, auth } = usePlatform();
  const order = m.order(orderId);
  const actor = auth.actor;
  const [reason, setReason] = useState("");
  const [designerId, setDesignerId] = useState("");
  if (!order || !actor) return null;
  const role = actor.role;
  const { designerAmount, platformFee } = splitAmount(order.price, order.commissionRate);
  const charges = m.charges.filter((c) => c.orderId === order.id);
  const months = planMonths(order);
  const b = order.briefing;
  const closed = order.status === "completed" || order.status === "cancelled";
  const canClientCancel = role === "client" && ["awaiting_designer", "awaiting_payment"].includes(order.status);
  const run = (err: string | null, ok: string) => (err ? toast.error(err) : (toast.success(ok), onClose()));

  return (
    <Modal size="lg" onClose={onClose} title={`${order.title}`} description={<span className="flex flex-wrap items-center gap-2"><OrderStatusBadge status={order.status} /> {order.number} · criado em {formatDay(order.createdAt.slice(0, 10))}</span>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4 text-small">
          <p className="mb-2 font-semibold">Contratação</p>
          <ul className="space-y-1 text-gray-700">
            {order.lines.map((l) => <li key={l.serviceId}>{l.quantity}× {l.serviceName} <span className="text-gray-400">({l.deliveryDays}d · {l.revisions} ajuste(s))</span></li>)}
          </ul>
          <p className="mt-3 text-lg font-bold">{formatPrice(order.price)}{order.kind === "plan" && <span className="text-small font-normal text-gray-500">/mês</span>}</p>
          {order.kind === "plan" && <p className="flex items-center gap-1 text-gray-600"><CalendarDays className="size-4" /> {order.months} meses: {formatMonth(months[0])} a {formatMonth(months.at(-1)!)} · vence dia {order.billingDay}</p>}
        </Card>
        <Card className="p-4 text-small">
          <p className="mb-2 font-semibold">Pessoas e valores</p>
          <p><span className="text-gray-500">Cliente:</span> {m.nameOf(order.clientId)}</p>
          <p><span className="text-gray-500">Designer:</span> {order.designerId ? m.nameOf(order.designerId) : "aguardando"}</p>
          {role !== "client" && (
            <div className="mt-3 rounded-lg bg-gray-50 p-3">
              <p>Designer recebe: <strong>{formatPrice(designerAmount)}</strong>{order.kind === "plan" && "/mês"}</p>
              <p>KreativeArt ({formatPercent(order.commissionRate)}): <strong>{formatPrice(platformFee)}</strong>{order.kind === "plan" && "/mês"}</p>
            </div>
          )}
          {order.cancelReason && <p className="mt-2 text-red-700">Cancelado: {order.cancelReason}</p>}
        </Card>
      </div>

      <Card className="p-4 text-small">
        <p className="mb-2 font-semibold">Briefing</p>
        {[["Objetivo", b.objective], ["Público", b.audience], ["Referências", b.references], ["Textos", b.copy], ["Observações", b.notes]].filter(([, v]) => v).map(([k, v]) => <p key={k} className="mb-1"><span className="font-medium">{k}:</span> <span className="whitespace-pre-line text-gray-700">{v}</span></p>)}
      </Card>

      <OrderProgress order={order} />
      {charges.length > 0 && <div><p className="mb-2 font-semibold">Cobranças</p><ChargesTable charges={charges} /></div>}

      {role === "designer" && order.status === "awaiting_designer" && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-small text-green-900">Ao aceitar, o pedido fica vinculado a você e a cobrança é gerada para a sua chave PIX. Você recebe <strong>{formatPrice(designerAmount)}</strong>{order.kind === "plan" ? " por mês" : ""}.</p>
          <Button variant="success" className="mt-3 w-full" onClick={() => run(m.acceptOrder(order.id, actor), "Pedido aceito! Aguardando o pagamento do cliente.")}><CheckCircle2 className="size-4" /> Aceitar pedido</Button>
        </div>
      )}

      {role === "admin" && !closed && (
        <div className="space-y-2 rounded-xl border border-gray-200 p-4">
          <p className="font-semibold">{order.designerId ? "Transferir para outro designer" : "Atribuir designer"}</p>
          <div className="flex gap-2">
            <SelectField className="flex-1" label="Designer" value={designerId} onChange={(e) => setDesignerId(e.target.value)}>
              <option value="">Escolha…</option>
              {m.designers.filter((d) => d.status === "active" && d.id !== order.designerId).map((d) => <option key={d.id} value={d.id}>{d.name} — {d.specialties?.join(", ")}</option>)}
            </SelectField>
            <Button className="self-end" disabled={!designerId} onClick={() => run(m.assignDesigner(order.id, designerId), "Designer atribuído.")}><UserCheck className="size-4" /> Confirmar</Button>
          </div>
        </div>
      )}

      {(canClientCancel || (role === "admin" && !closed)) && (
        <details className="rounded-xl border border-red-200 p-4">
          <summary className="cursor-pointer font-semibold text-red-700">Cancelar pedido</summary>
          <TextArea className="mt-3" label="Motivo" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button variant="danger" className="mt-2" onClick={() => run(m.cancelOrder(order.id, actor, reason), "Pedido cancelado.")}><XCircle className="size-4" /> Confirmar cancelamento</Button>
        </details>
      )}
    </Modal>
  );
});
