import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { uploadPrivateDocument } from '../lib/storage';
import { onAccountChange } from '../lib/accountScope';

export type PropertyType = 'villa' | 'apartment' | 'house' | 'studio' | 'room';

export interface HostOnboardingData {
  // Step 2 — Identity (complete)
  fullName: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  photoURL: string | null;

  // Step 3 — KYC documents
  kycSelfie: string | null;
  kycIdFront: string | null;
  kycIdBack: string | null;
  kycStatus: 'idle' | 'pending' | 'submitted';

  // Step 4 — Property types (multi-select — un hôte peut avoir plusieurs types)
  propertyTypes: PropertyType[];
}

interface HostOnboardingState {
  step: number;
  data: HostOnboardingData;
  completed: boolean;

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (patch: Partial<HostOnboardingData>) => void;
  togglePropertyType: (type: PropertyType) => void;
  complete: () => Promise<void>;
  reset: () => void;
}

const INITIAL_DATA: HostOnboardingData = {
  fullName: '',
  phone: '',
  dateOfBirth: '',
  nationality: 'Rwanda',
  photoURL: null,
  kycSelfie: null,
  kycIdFront: null,
  kycIdBack: null,
  kycStatus: 'idle',
  propertyTypes: [],
};
let formGeneration = 0;

export const useHostOnboardingStore = create<HostOnboardingState>((set, get) => ({
  step: 1,
  data: { ...INITIAL_DATA },
  completed: false,

  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 6) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 1) })),
  updateData: (patch) => set((s) => ({ data: { ...s.data, ...patch } })),
  togglePropertyType: (type) => {
    const { propertyTypes } = get().data;
    const next = propertyTypes.includes(type)
      ? propertyTypes.filter((t) => t !== type)
      : [...propertyTypes, type];
    set((s) => ({ data: { ...s.data, propertyTypes: next } }));
  },
  complete: async () => {
    const request = formGeneration;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (request !== formGeneration) throw new Error('Le compte ou le dossier actif a changé.');
    if (!user) throw new Error('Connectez-vous pour envoyer votre dossier.');
    const form = get().data;
    if (!form.fullName.trim() || !form.kycSelfie || !form.kycIdFront || !form.kycIdBack) throw new Error('Complétez votre identité et les trois justificatifs.');
    const documents: string[] = [];
    for (const uri of [form.kycSelfie, form.kycIdFront, form.kycIdBack]) {
      const mimeType = /\.png(?:\?|$)/i.test(uri) ? 'image/png' : /\.webp(?:\?|$)/i.test(uri) ? 'image/webp' : 'image/jpeg';
      documents.push(await uploadPrivateDocument(uri, mimeType, user.id));
      if (request !== formGeneration) throw new Error('Le compte ou le dossier actif a changé.');
    }
    const { data: current } = await supabase.auth.getUser();
    if (request !== formGeneration) throw new Error('Le compte ou le dossier actif a changé.');
    if (current.user?.id !== user.id) throw new Error('Le compte actif a changé.');
    const { error } = await supabase.rpc('submit_host_application', {
      p_legal_name: form.fullName.trim(), p_document_keys: documents,
      // The existing RPC stores identity metadata here; no payout details are collected at launch.
      p_payout_details: { phone: form.phone,
        date_of_birth: form.dateOfBirth, nationality: form.nationality, property_types: form.propertyTypes },
    });
    if (error) throw error;
    if (request !== formGeneration) throw new Error('Le compte ou le dossier actif a changé.');
    set({ completed: true, data: { ...get().data, kycStatus: 'submitted' } });
  },
  reset: () => { ++formGeneration; set({ step: 1, data: { ...INITIAL_DATA }, completed: false }); },
}));
onAccountChange(() => useHostOnboardingStore.getState().reset());
