import { RegisterPageContent } from '@kizuna/core/client/components/register-page';

// Formulário de cadastro completo (formik + Yup + POST /api/auth/register) vem do
// core. O PRIMEIRO usuário cadastrado vira root automaticamente.
export default function RegisterPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-10 md:px-6">
      <RegisterPageContent />
    </div>
  );
}
