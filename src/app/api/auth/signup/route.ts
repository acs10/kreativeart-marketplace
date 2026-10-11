import { newId } from "@/core/lib/format";
import { emptyBrand, PIX_KEY_TYPES, SPECIALTIES, type Account, type SignupInput } from "@/modules/accounts/domain/types";
import { AuthStore } from "@/modules/auth/store/auth-store";
import { handle, json, readJson, sameOrigin, stateResponse } from "@/modules/server/api";
import { actorOf, mutate } from "@/modules/server/marketplace-service";
import { hashPassword } from "@/modules/server/secrets";
import { startSession } from "@/modules/server/session";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Cadastro de cliente ou designer (designer fica "em análise" até a KreativeArt aprovar). */
export async function POST(req: Request) {
  return handle("signup", async () => {
    if (!sameOrigin(req)) return json({ error: "Origem não permitida." }, 403);
    const b = (await readJson(req)) ?? {};
    const role = b.role === "designer" ? "designer" : "client";
    const input: SignupInput = {
      role,
      name: str(b.name, 80),
      email: str(b.email, 120),
      password: str(b.password, 200),
      phone: str(b.phone, 30),
      company: str(b.company, 100),
      document: str(b.document, 30),
      instagram: str(b.instagram, 60),
      bio: str(b.bio, 1000),
      specialties: Array.isArray(b.specialties) ? b.specialties.filter((s) => SPECIALTIES.includes(s)) : [],
      portfolioUrl: /^https:\/\/\S+$/i.test(str(b.portfolioUrl, 300)) ? str(b.portfolioUrl, 300) : "",
      pixKeyType: PIX_KEY_TYPES.find((t) => t === b.pixKeyType),
      pixKey: str(b.pixKey, 120),
      weeklyCapacity: typeof b.weeklyCapacity === "number" && b.weeklyCapacity >= 1 && b.weeklyCapacity <= 100 ? Math.round(b.weeklyCapacity) : 5,
    };
    const errors = AuthStore.validateSignup(input);
    if (Object.keys(errors).length) return json({ errors }, 422);
    const passwordHash = await hashPassword(input.password);
    const { result, data } = await mutate(
      (m) => {
        if (m.emailInUse(input.email)) return { errors: { email: "Já existe uma conta com este e-mail." } };
        const account: Account = {
          id: newId(),
          role,
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          passwordHash,
          phone: input.phone,
          status: role === "designer" ? "pending" : "active",
          createdAt: new Date().toISOString(),
          ...(role === "client"
            ? { company: input.company?.trim(), document: input.document?.trim(), instagram: input.instagram?.trim(), brand: emptyBrand() }
            : { bio: input.bio?.trim(), specialties: input.specialties, portfolioUrl: input.portfolioUrl?.trim(), pixKeyType: input.pixKeyType, pixKey: input.pixKey?.trim(), document: input.document?.trim(), weeklyCapacity: input.weeklyCapacity }),
        };
        m.addAccount(account);
        return { id: account.id };
      },
      [],
      (r) => "errors" in r,
    );
    if ("errors" in result) return json({ errors: result.errors }, 422);
    await startSession(result.id);
    return stateResponse(data, actorOf(data.accounts, result.id));
  });
}
