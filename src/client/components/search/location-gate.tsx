'use client';

import { useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { LocationModal } from '../location-modal';
import { useUserLocation } from '../../hooks/use-user-location';

/**
 * Portão de localização da /busca: a localização (estado + cidade) é obrigatória. Não detecta
 * nada por conta própria — espera a inicialização do `useUserLocation`, a mesma de qualquer tela
 * (local salvo revalidado, ou IP → cidade padrão do projeto). Só mostra o seletor manual quando
 * ela termina sem local.
 */
export function LocationGate({ children }: { children: React.ReactNode }) {
  const { location, ready } = useUserLocation();
  const [checkTick, setCheckTick] = useState(0);

  if (location?.stateCode) return <>{children}</>;

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Detectando sua região…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <MapPin className="h-7 w-7" />
      </span>
      <div>
        <h1 className="text-xl font-bold">Onde você está?</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Não conseguimos detectar sua região automaticamente. Escolha sua cidade para ver os
          serviços disponíveis perto de você.
        </p>
      </div>
      <LocationModal open onClose={() => setCheckTick((n) => n + 1)} key={checkTick} />
    </div>
  );
}
