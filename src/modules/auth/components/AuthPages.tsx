"use client";

import { Eye, EyeOff, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { maskPhone } from "@/core/lib/format";
import { observer } from "@/core/state/mobx";
import { Logo } from "@/core/ui/Logo";
import { Button, Card, Field, SelectField, TextArea } from "@/core/ui/ui";
import { PIX_KEY_TYPES, ROLE_HOME, SPECIALTIES, type PixKeyType, type Role, type SignupInput, type Specialty } from "@/modules/accounts/domain/types";
import { usePlatform } from "@/modules/platform/PlatformProvider";
import { AuthStore, DEMO_LOGINS, DEMO_PASSWORD } from "../store/auth-store";

/** Só aceita voltar para caminhos internos (evita redirecionamento para outro site). */
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : null);

function AuthFrame({ title, subtitle, children, wide }: { title: string; subtitle: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <main className="brand-gradient-soft flex min-h-screen items-start justify-center px-4 py-10 sm:items-center">
      <Card className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} p-6 shadow-xl sm:p-8`}>
        <Link href="/" className="mb-6 flex justify-center"><Logo subtitle="Design sob demanda" /></Link>
        <h1 className="text-center text-2xl font-bold">{title}</h1>
        <p className="mb-6 mt-1 text-center text-gray-600">{subtitle}</p>
        {children}
      </Card>
    </main>
  );
}

function PasswordField({ label, value, onChange, error, autoComplete }: { label: string; value: string; onChange: (v: string) => void; error?: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Field label={label} type={show ? "text" : "password"} autoComplete={autoComplete} value={value} error={error} onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-700" aria-label={show ? "Ocultar senha" : "Mostrar senha"}>{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
    </div>
  );
}

export const LoginPage = observer(function LoginPage() {
  const { auth } = usePlatform();
  const router = useRouter();
  const params = useSearchParams();
  const perfil = params.get("perfil") as Role | null;
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const enter = async (mail: string, pass: string) => {
    setBusy(true);
    const err = await auth.login(mail, pass);
    setBusy(false);
    if (err) return setError(err);
    router.replace(next && next.startsWith(ROLE_HOME[auth.role!]) ? next : next?.startsWith("/contratar") ? next : ROLE_HOME[auth.role!]);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void enter(email, password);
  };
  const title = perfil === "designer" ? "Área do designer" : perfil === "client" ? "Área do cliente" : "Entrar";

  return (
    <AuthFrame title={title} subtitle={next?.startsWith("/contratar") ? "Entre ou crie sua conta para concluir a contratação." : "Acesse sua conta KreativeArt."}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField label="Senha" autoComplete="current-password" value={password} onChange={setPassword} />
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-small text-red-700">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}><LogIn className="size-4" /> Entrar</Button>
      </form>
      <div className="mt-5 grid gap-2 text-center text-small sm:grid-cols-2">
        <Link href={`/cadastro/cliente${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-purple-700 hover:bg-purple-50">Criar conta de cliente</Link>
        <Link href="/cadastro/designer" className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50">Quero ser designer</Link>
      </div>
      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-caption text-amber-900">
        <p className="mb-2 font-semibold">Protótipo — acesso rápido (senha {DEMO_PASSWORD})</p>
        <div className="flex flex-wrap gap-2">
          {DEMO_LOGINS.map((d) => (
            <button key={d.email} disabled={busy} onClick={() => void enter(d.email, DEMO_PASSWORD)} className="rounded-md border border-amber-300 bg-white px-2.5 py-1 font-semibold hover:bg-amber-100">{d.label}</button>
          ))}
        </div>
        <p className="mt-2">Outros designers: bruno@, diego@ e carla@kreativeart.com (Carla está em análise). Clientes: comercial@fashionstore.com, contato@cafearoma.com.</p>
      </div>
    </AuthFrame>
  );
});

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export const SignupPage = observer(function SignupPage({ role }: { role: "client" | "designer" }) {
  const { auth } = usePlatform();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [f, setF] = useState<SignupInput>({ role, name: "", email: "", password: "", phone: "", company: "", document: "", instagram: "", bio: "", specialties: [], portfolioUrl: "", pixKeyType: "CPF", pixKey: "", weeklyCapacity: 5 });
  const [confirm, setConfirm] = useState("");
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof SignupInput>(k: K, v: SignupInput[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const extra: Record<string, string> = {};
    if (confirm !== f.password) extra.confirm = "As senhas não conferem.";
    if (!accept) extra.accept = "É preciso aceitar os termos.";
    setBusy(true);
    const errs = Object.keys(extra).length ? { ...AuthStore.validateSignup(f), ...extra } : await auth.signup(f);
    setBusy(false);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    router.replace(role === "client" ? next ?? "/cliente" : "/designer");
  };

  return (
    <AuthFrame wide title={role === "client" ? "Criar conta de cliente" : "Cadastro de designer"} subtitle={role === "client" ? "Para contratar serviços e acompanhar tudo pela sua área." : "Depois do cadastro, a KreativeArt analisa o seu portfólio."}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field className="sm:col-span-2" label="Nome completo" autoComplete="name" value={f.name} error={errors.name} onChange={(e) => set("name", e.target.value)} />
        {role === "client" && <Field label="Empresa ou marca" value={f.company} error={errors.company} onChange={(e) => set("company", e.target.value)} />}
        <Field label={role === "client" ? "CPF ou CNPJ (opcional)" : "CPF ou CNPJ"} value={f.document} error={errors.document} onChange={(e) => set("document", e.target.value)} hint={role === "designer" ? "Necessário para os repasses." : undefined} />
        <Field label="E-mail" type="email" autoComplete="email" value={f.email} error={errors.email} onChange={(e) => set("email", e.target.value)} />
        <Field label="Telefone / WhatsApp" type="tel" inputMode="tel" autoComplete="tel-national" value={f.phone} error={errors.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} />
        {role === "client" && <Field label="Instagram da marca (opcional)" placeholder="@suamarca" value={f.instagram} onChange={(e) => set("instagram", e.target.value)} />}

        {role === "designer" && (
          <>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1.5 text-small font-medium text-gray-700">Especialidades</legend>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((s) => (
                  <button key={s} type="button" aria-pressed={f.specialties!.includes(s)} onClick={() => set("specialties", toggle<Specialty>(f.specialties!, s))} className={`rounded-full border px-3 py-1 text-small ${f.specialties!.includes(s) ? "border-purple-500 bg-purple-50 font-semibold text-purple-700" : "border-gray-300 text-gray-600"}`}>{s}</button>
                ))}
              </div>
              {errors.specialties && <p className="mt-1 text-caption text-red-600">{errors.specialties}</p>}
            </fieldset>
            <Field label="Portfólio (Behance, Dribbble, Instagram…)" type="url" placeholder="https://" value={f.portfolioUrl} onChange={(e) => set("portfolioUrl", e.target.value)} />
            <Field label="Peças por semana que consegue entregar" type="number" min={1} max={60} value={f.weeklyCapacity} onChange={(e) => set("weeklyCapacity", Number(e.target.value))} />
            <TextArea className="sm:col-span-2" label="Sobre você" rows={3} value={f.bio} onChange={(e) => set("bio", e.target.value)} />
            <div className="rounded-lg border border-purple-100 bg-purple-50/60 p-4 sm:col-span-2">
              <p className="mb-3 text-small font-semibold text-purple-900">Para receber: o cliente paga direto nesta chave PIX.</p>
              <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                <SelectField label="Tipo da chave" value={f.pixKeyType} error={errors.pixKeyType} onChange={(e) => set("pixKeyType", e.target.value as PixKeyType)}>
                  {PIX_KEY_TYPES.map((t) => <option key={t}>{t}</option>)}
                </SelectField>
                <Field label="Chave PIX" value={f.pixKey} error={errors.pixKey} onChange={(e) => set("pixKey", e.target.value)} />
              </div>
            </div>
          </>
        )}

        <PasswordField label="Senha (mín. 8 caracteres)" autoComplete="new-password" value={f.password} error={errors.password} onChange={(v) => set("password", v)} />
        <PasswordField label="Repita a senha" autoComplete="new-password" value={confirm} error={errors.confirm} onChange={setConfirm} />
        <label className="flex items-start gap-2 text-small text-gray-600 sm:col-span-2">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-1 accent-purple-600" />
          <span>Li e aceito os termos de uso e a política de privacidade da KreativeArt.{errors.accept && <span className="block text-caption text-red-600">{errors.accept}</span>}</span>
        </label>
        <Button type="submit" className="sm:col-span-2" disabled={busy}>{role === "client" ? "Criar conta" : "Enviar cadastro"}</Button>
      </form>
      <p className="mt-5 text-center text-small text-gray-600">Já tem conta? <Link href={`/entrar?perfil=${role}${next ? `&next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-purple-700 hover:underline">Entrar</Link></p>
    </AuthFrame>
  );
});
