import { create } from "zustand";

export interface TicketType {
  id: string;
  name: string;
  price: number;
}

export interface EventFormData {
  // Step 1: Edit
  eventName: string;
  eventCategory: string;
  eventType: "single" | "recurring";
  sessions: {
    startDate: string;
    startTime: string;
    endTime: string;
  }[];
  location: string;
  eventDescription: string;

  // Step 2: Banner
  bannerImage: File | null;
  bannerImageUrl: string;

  // Step 3: Ticketing
  ticketingType: "free" | "paid";
  ticketTypes: TicketType[];
}

interface EventStore {
  currentStep: number;
  formData: EventFormData;
  setCurrentStep: (step: number) => void;
  updateFormData: (data: Partial<EventFormData>) => void;
  addTicketType: () => void;
  removeTicketType: (id: string) => void;
  updateTicketType: (id: string, updates: Partial<TicketType>) => void;
  resetForm: () => void;
}

const initialFormData: EventFormData = {
  eventName: "",
  eventCategory: "",
  eventType: "single",
  sessions: [
    {
      startDate: "",
      startTime: "",
      endTime: "",
    },
  ],
  location: "",
  eventDescription: "",
  bannerImage: null,
  bannerImageUrl: "",
  ticketingType: "free",
  ticketTypes: [{ id: "1", name: "General Admission", price: 0 }],
};

export const useEventStore = create<EventStore>((set, get) => ({
  currentStep: 1,
  formData: initialFormData,

  setCurrentStep: (step: number) => set({ currentStep: step }),

  updateFormData: (data: Partial<EventFormData>) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),

  addTicketType: () => {
    const { formData } = get();
    const newTicket: TicketType = {
      id: Date.now().toString(),
      name: "",
      price: formData.ticketingType === "free" ? 0 : 10,
    };
    set((state) => ({
      formData: {
        ...state.formData,
        ticketTypes: [...state.formData.ticketTypes, newTicket],
      },
    }));
  },

  removeTicketType: (id: string) => {
    const { formData } = get();
    if (formData.ticketTypes.length > 1) {
      set((state) => ({
        formData: {
          ...state.formData,
          ticketTypes: state.formData.ticketTypes.filter(
            (ticket) => ticket.id !== id
          ),
        },
      }));
    }
  },

  updateTicketType: (id: string, updates: Partial<TicketType>) => {
    set((state) => ({
      formData: {
        ...state.formData,
        ticketTypes: state.formData.ticketTypes.map((ticket) =>
          ticket.id === id ? { ...ticket, ...updates } : ticket
        ),
      },
    }));
  },

  resetForm: () => set({ formData: initialFormData, currentStep: 1 }),
}));
