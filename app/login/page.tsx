import { LoginForm } from "@/components/LoginForm";
import { envString } from "@/lib/env";
export const dynamic = "force-dynamic";
export default function LoginPage() {
 const providers = (["github", "google"] as const).filter((name) => envString(`${name.toUpperCase()}_CLIENT_ID`) && envString(`${name.toUpperCase()}_CLIENT_SECRET`));
 return <LoginForm providers={providers} />;
}
