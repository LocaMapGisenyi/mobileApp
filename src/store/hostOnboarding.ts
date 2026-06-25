import { create } from 'zustand';

export type PropertyType = 'villa' | 'apartment' | 'house' | 'studio' | 'room';
export type PaymentMethod = 'mtn_momo' | 'airtel_money' | 'bank';

export interface HostOnboardingData {
  // Step 2 — Identity
  fullName: string;
  phone: string;
  photoURL: string | null;

  // Step 3 — Property types (multi-select — un hôte peut avoir plusieurs types)
  propertyTypes: PropertyType[];

  // Step 4 — Payment (multi-select)
  paymentMethods: PaymentMethod[];
  mtnNumber: string;
  airtelNumber: string;
  bankName: string;
  bankAccount: string;
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
  togglePaymentMethod: (method: PaymentMethod) => void;
  complete: () => void;
  reset: () => void;
}

const INITIAL_DATA: HostOnboardingData = {
  fullName: '',
  phone: '',
  photoURL: null,
  propertyTypes: [],
  paymentMethods: [],
  mtnNumber: '',
  airtelNumber: '',
  bankName: '',
  bankAccount: '',
};

export const useHostOnboardingStore = create<HostOnboardingState>((set, get) => ({
  step: 1,
  data: { ...INITIAL_DATA },
  completed: false,

  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 5) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 1) })),
  updateData: (patch) => set((s) => ({ data: { ...s.data, ...patch } })),
  togglePropertyType: (type) => {
    const { propertyTypes } = get().data;
    const next = propertyTypes.includes(type)
      ? propertyTypes.filter((t) => t !== type)
      : [...propertyTypes, type];
    set((s) => ({ data: { ...s.data, propertyTypes: next } }));
  },
  togglePaymentMethod: (method) => {
    const { paymentMethods } = get().data;
    const next = paymentMethods.includes(method)
      ? paymentMethods.filter((m) => m !== method)
      : [...paymentMethods, method];
    set((s) => ({ data: { ...s.data, paymentMethods: next } }));
  },
  complete: () => set({ completed: true }),
  reset: () => set({ step: 1, data: { ...INITIAL_DATA }, completed: false }),
}));
