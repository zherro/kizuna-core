import { LoginPageContent } from '@kizuna/core/client/components/login-page';

// Formulário de login completo (formik + Yup + POST /api/auth/login) vem do core.
// Ajuste só o wrapper/estilo conforme o seu app.
export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-10 md:px-6">
      <LoginPageContent />
    </div>
  );
}
