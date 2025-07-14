import { create } from "zustand";
import { EventType, EventStatus } from "../generated/prisma";

export interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface EventFormData {
  title: string;
  description: string;
  category: string;
  tags: string[];
  eventType: EventType;
  date: Date | null;
  endDate: Date | null;
  location: string;
  venue: string;
  address: string;
  latitude?: number;
  longitude?: number;
  bannerImage: File | null;
  imageUrl: string;
  ticketTypes: TicketType[];
  maxAttendees?: number;
  isPublic: boolean;
  status: EventStatus;
  slug: string;
}

interface EventStore {
  currentStep: number;
  formData: EventFormData;
  isLoading: boolean;
  errors: Record<string, string>;

  // Navigation
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Form data management
  updateFormData: (data: Partial<EventFormData>) => void;
  setFormData: (data: EventFormData) => void;

  // Ticket management
  addTicketType: () => void;
  removeTicketType: (id: string) => void;
  updateTicketType: (id: string, updates: Partial<TicketType>) => void;

  // Validation
  validateStep: (step: number) => boolean;
  setError: (field: string, error: string) => void;
  clearError: (field: string) => void;
  clearAllErrors: () => void;

  // Utilities
  generateSlug: (title: string) => string;
  resetForm: () => void;

  // Loading states
  setLoading: (loading: boolean) => void;

  // Event management
  createEvent: (organizerId: string) => Promise<any>;
  updateEvent: (eventId: string) => Promise<any>;
  loadEvent: (eventId: string) => Promise<void>;
}

const initialFormData: EventFormData = {
  title: "",
  description: "",
  category: "",
  tags: [],
  eventType: EventType.FREE,
  date: null,
  endDate: null,
  location: "",
  venue: "",
  address: "",
  bannerImage: null,
  imageUrl: "",
  ticketTypes: [
    {
      id: "default",
      name: "General Admission",
      price: 0,
      quantity: 100,
    },
  ],
  isPublic: true,
  status: EventStatus.DRAFT,
  slug: "",
};

export const useEventStore = create<EventStore>((set, get) => ({
  currentStep: 1,
  formData: initialFormData,
  isLoading: false,
  errors: {},

  // Navigation
  setCurrentStep: (step: number) => set({ currentStep: step }),

  nextStep: () => {
    const { currentStep, validateStep } = get();
    if (validateStep(currentStep) && currentStep < 5) {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1 });
    }
  },

  // Form data management
  updateFormData: (data: Partial<EventFormData>) => {
    set((state) => {
      const newFormData = { ...state.formData, ...data };

      // Auto-generate slug when title changes
      if (data.title && data.title !== state.formData.title) {
        newFormData.slug = get().generateSlug(data.title);
      }

      // Auto-adjust ticket types when event type changes
      if (data.eventType && data.eventType !== state.formData.eventType) {
        if (data.eventType === EventType.FREE) {
          newFormData.ticketTypes = state.formData.ticketTypes.map(
            (ticket) => ({
              ...ticket,
              price: 0,
            })
          );
        }
      }

      return { formData: newFormData };
    });
  },

  setFormData: (data: EventFormData) => set({ formData: data }),

  // Ticket management
  addTicketType: () => {
    const { formData } = get();
    const newTicket: TicketType = {
      id: `ticket_${Date.now()}`,
      name: "",
      price: formData.eventType === EventType.FREE ? 0 : 1000, // 1000 kobo = ₦10
      quantity: 50,
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

  // Validation
  validateStep: (step: number) => {
    const { formData, setError, clearAllErrors } = get();
    clearAllErrors();

    switch (step) {
      case 1: // Basic Info
        if (!formData.title.trim()) {
          setError("title", "Event title is required");
          return false;
        }
        if (!formData.description.trim()) {
          setError("description", "Event description is required");
          return false;
        }
        if (!formData.category.trim()) {
          setError("category", "Event category is required");
          return false;
        }
        break;

      case 2: // Date & Time
        if (!formData.date) {
          setError("date", "Event date is required");
          return false;
        }
        if (formData.date < new Date()) {
          setError("date", "Event date cannot be in the past");
          return false;
        }
        if (formData.endDate && formData.endDate < formData.date) {
          setError("endDate", "End date cannot be before start date");
          return false;
        }
        break;

      case 3: // Location
        if (!formData.location.trim()) {
          setError("location", "Event location is required");
          return false;
        }
        break;

      case 5: // Ticketing
        if (formData.eventType === EventType.PAID) {
          const hasValidTickets = formData.ticketTypes.some(
            (ticket) =>
              ticket.name.trim() && ticket.price > 0 && ticket.quantity > 0
          );
          if (!hasValidTickets) {
            setError(
              "ticketTypes",
              "At least one valid paid ticket type is required"
            );
            return false;
          }
        }

        // Validate each ticket type
        for (const ticket of formData.ticketTypes) {
          if (!ticket.name.trim()) {
            setError(`ticket_${ticket.id}_name`, "Ticket name is required");
            return false;
          }
          if (ticket.quantity <= 0) {
            setError(
              `ticket_${ticket.id}_quantity`,
              "Ticket quantity must be greater than 0"
            );
            return false;
          }
          if (formData.eventType === EventType.PAID && ticket.price <= 0) {
            setError(
              `ticket_${ticket.id}_price`,
              "Ticket price must be greater than 0 for paid events"
            );
            return false;
          }
        }
        break;
    }

    return true;
  },

  setError: (field: string, error: string) => {
    set((state) => ({
      errors: { ...state.errors, [field]: error },
    }));
  },

  clearError: (field: string) => {
    set((state) => {
      const { [field]: _, ...rest } = state.errors;
      return { errors: rest };
    });
  },

  clearAllErrors: () => set({ errors: {} }),

  // Utilities
  generateSlug: (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-]+|[-]+$/g, "")
      .substring(0, 50);
  },

  resetForm: () =>
    set({
      formData: initialFormData,
      currentStep: 1,
      errors: {},
      isLoading: false,
    }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  // Event management
  createEvent: async (organizerId: string) => {
    const { formData, setLoading } = get();
    setLoading(true);

    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        eventType: formData.eventType,
        date: formData.date!.toISOString(),
        endDate: formData.endDate?.toISOString(),
        location: formData.location,
        venue: formData.venue,
        address: formData.address,
        tags: formData.tags,
        category: formData.category,
        imageUrl: formData.imageUrl,
        slug: formData.slug,
        ticketTypes: formData.ticketTypes.map(({ id, ...ticket }) => ({
          name: ticket.name,
          price: ticket.price,
          quantity: ticket.quantity,
        })),
      };

      const response = await fetch("/api/events/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create event");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  },

  updateEvent: async (eventId: string) => {
    const { formData, setLoading } = get();
    setLoading(true);

    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        eventType: formData.eventType,
        date: formData.date!,
        endDate: formData.endDate,
        location: formData.location,
        venue: formData.venue,
        address: formData.address,
        tags: formData.tags,
        category: formData.category,
        imageUrl: formData.imageUrl,
        isPublic: formData.isPublic,
        status: formData.status,
      };

      const response = await fetch(`/api/events/${eventId}/edit`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update event");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  },

  loadEvent: async (eventId: string) => {
    const { setLoading, setFormData } = get();
    setLoading(true);

    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load event");
      }

      const event = await response.json();

      // Convert the event data to form data format
      const formData: EventFormData = {
        title: event.title,
        description: event.description,
        category: event.category || "",
        tags: event.tags || [],
        eventType: event.eventType,
        date: new Date(event.date),
        endDate: event.endDate ? new Date(event.endDate) : null,
        location: event.location,
        venue: event.venue || "",
        address: event.address || "",
        bannerImage: null,
        imageUrl: event.imageUrl || "",
        ticketTypes: event.ticketTypes.map((ticket: any) => ({
          id: ticket.id,
          name: ticket.name,
          price: ticket.price,
          quantity: ticket.quantity,
        })),
        isPublic: event.isPublic,
        status: event.status,
        slug: event.slug,
      };

      setFormData(formData);
    } catch (error) {
      console.error("Error loading event:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  },
}));
