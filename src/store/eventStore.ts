import { create } from "zustand";
import { EventType, EventStatus } from "@/generated/prisma";

export interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}

// Add the missing EventData interface
export interface EventData {
  id: string;
  title: string;
  category: string;
  date: string;
  startTime: string;
  endTime?: string;
  location: string;
  venue?: string;
  imageUrl?: string;
  eventType: "FREE" | "PAID";
  slug: string;
  organizer?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  ticketTypes?: Array<{
    id: string;
    name: string;
    price: number;
    quantity?: number;
  }>;
  _count?: {
    tickets: number;
    favorites: number;
  };
  createdAt: string;
  description?: string;
  tags: string[];
  address?: string;
  status?: EventStatus;
}

export interface EventFormData {
  title: string;
  description: string;
  category: string;
  tags: string[];
  eventType: EventType;
  date: Date | null;
  endDate: Date | null;
  startTime: string;
  endTime: string;
  location: string;
  venue: string;
  address: string;
  latitude?: number;
  longitude?: number;
  bannerImage: File | null;
  imageUrl: string;
  ticketTypes: TicketType[];
  isPublic: boolean;
  status: EventStatus;
  slug: string;
  // organizerId?: string;
  // organizer?: {
  //   id: string;
  //   name: string;
  //   email: string;
  //   image?: string;
  // };
}

export interface EventStep {
  step: number;
  label: string;
}

interface EventStore {
  // Step configuration
  steps: EventStep[];
  currentStep: number;
  formData: EventFormData;
  isLoading: boolean;
  errors: Record<string, string>;
  allEvents: EventData[];
  eventsLoading: boolean;
  eventsError: string | null;
  currentEvent: EventData | null;

  // Navigation
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoNext: () => boolean;
  canGoPrev: () => boolean;

  // Form data management
  updateFormData: (data: Partial<EventFormData>) => void;
  setFormData: (data: EventFormData) => void;

  // Tags management
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  setTags: (tags: string[]) => void;

  // Ticket management
  addTicketType: () => void;
  removeTicketType: (id: string) => void;
  updateTicketType: (id: string, updates: Partial<TicketType>) => void;

  // Validation
  validateStep: (step: number) => boolean;
  validateCurrentStep: () => boolean;
  setError: (field: string, error: string) => void;
  clearError: (field: string) => void;
  clearAllErrors: () => void;

  // Utilities
  generateSlug: (title: string) => string;
  resetForm: () => void;
  getStepLabel: (step: number) => string;
  isStepComplete: (step: number) => boolean;

  // Loading states
  setLoading: (loading: boolean) => void;

  setCurrentEvent: (event: EventData | null) => void; // Add this
  getCurrentEvent: () => EventData | null;

  // Event management
  createEvent: () => Promise<any>;
  updateEvent: (eventId: string) => Promise<any>;
  updateEventTickets: (eventId: string) => Promise<any>; // Add missing method
  loadEvent: (eventId: string) => Promise<void>;

  loadEvents: (params?: {
    category?: string;
    location?: string;
    eventType?: string;
    status?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }) => Promise<{ events: EventData[]; totalCount: number; hasMore: boolean }>;

  setAllEvents: (events: EventData[]) => void;
  setEventsLoading: (loading: boolean) => void;
  setEventsError: (error: string | null) => void;
  clearEvents: () => void;
}

const eventSteps: EventStep[] = [
  { step: 1, label: "Edit" },
  { step: 2, label: "Banner" },
  { step: 3, label: "Ticketing" },
  { step: 4, label: "Review" },
];

const initialFormData: EventFormData = {
  title: "",
  description: "",
  category: "",
  tags: [],
  eventType: EventType.FREE,
  date: null,
  endDate: null,
  startTime: "",
  endTime: "",
  location: "",
  venue: "",
  address: "",
  bannerImage: null,
  imageUrl: "",
  ticketTypes: [
    {
      id: "default",
      name: "Standard",
      price: 0,
    },
  ],
  isPublic: true,
  status: EventStatus.DRAFT,
  slug: "",
};

export const useEventStore = create<EventStore>((set, get) => ({
  steps: eventSteps,
  currentStep: 1,
  formData: initialFormData,
  isLoading: false,
  errors: {},
  allEvents: [],
  eventsLoading: false,
  eventsError: null,
  currentEvent: null,

  // Navigation
  setCurrentStep: (step: number) => {
    if (step >= 1 && step <= eventSteps.length) {
      set({ currentStep: step });
    }
  },

  nextStep: () => {
    const { currentStep, validateCurrentStep } = get();
    if (validateCurrentStep() && currentStep < eventSteps.length) {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1 });
    }
  },

  canGoNext: () => {
    const { currentStep, validateCurrentStep } = get();
    return validateCurrentStep() && currentStep < eventSteps.length;
  },

  canGoPrev: () => {
    const { currentStep } = get();
    return currentStep > 1;
  },

  setCurrentEvent: (event: EventData | null) => set({ currentEvent: event }),

  getCurrentEvent: () => get().currentEvent,

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

  // Tags management
  addTag: (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !get().formData.tags.includes(trimmedTag)) {
      set((state) => ({
        formData: {
          ...state.formData,
          tags: [...state.formData.tags, trimmedTag],
        },
      }));
    }
  },

  removeTag: (tag: string) => {
    set((state) => ({
      formData: {
        ...state.formData,
        tags: state.formData.tags.filter((t) => t !== tag),
      },
    }));
  },

  setTags: (tags: string[]) => {
    set((state) => ({
      formData: {
        ...state.formData,
        tags: tags.filter((tag) => tag.trim() !== ""),
      },
    }));
  },

  // Ticket management
  addTicketType: () => {
    const { formData } = get();
    const newTicket: TicketType = {
      id: `ticket_${Date.now()}`,
      name: "",
      price: formData.eventType === EventType.FREE ? 0 : 1000, // 1000 kobo = ₦10
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
      case 1: // Edit Step
        if (!formData.title.trim()) {
          setError("title", "Event title is required");
          return false;
        }
        if (!formData.category.trim()) {
          setError("category", "Event category is required");
          return false;
        }
        if (!formData.date) {
          setError("date", "Event date is required");
          return false;
        }
        if (formData.date < new Date()) {
          setError("date", "Event date cannot be in the past");
          return false;
        }
        if (!formData.startTime.trim()) {
          setError("startTime", "Start time is required");
          return false;
        }
        if (
          formData.endTime &&
          formData.endTime.trim() &&
          formData.endTime <= formData.startTime
        ) {
          setError("endTime", "End time must be after start time");
          return false;
        }
        if (!formData.location.trim()) {
          setError("location", "Event location is required");
          return false;
        }
        if (!formData.description.trim()) {
          setError("description", "Event description is required");
          return false;
        }
        if (formData.tags.length === 0) {
          setError("tags", "At least one tag is required");
          return false;
        }
        break;

      case 2: // Banner Step
        if (formData.bannerImage) {
          const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
          ];
          const maxSize = 5 * 1024 * 1024; // 5MB

          // Check file type
          if (!allowedTypes.includes(formData.bannerImage.type)) {
            setError(
              "bannerImage",
              "Image must be in JPEG, PNG, or WebP format"
            );
            return false;
          }

          // Check file size
          if (formData.bannerImage.size > maxSize) {
            setError("bannerImage", "Image size must be less than 5MB");
            return false;
          }
        }
        break;

      case 3: // Ticketing Step
        if (formData.eventType === EventType.PAID) {
          const hasValidTickets = formData.ticketTypes.some(
            (ticket) =>
              ticket.name.trim() &&
              ticket.price > 0 &&
              (ticket.quantity === undefined || ticket.quantity > 0)
          );
          if (!hasValidTickets) {
            setError(
              "ticketTypes",
              "At least one valid paid ticket type is required"
            );
            return false;
          }
        }

        for (const ticket of formData.ticketTypes) {
          if (!ticket.name.trim()) {
            setError(`ticket_${ticket.id}_name`, "Ticket name is required");
            return false;
          }
          if (ticket.quantity !== undefined && ticket.quantity <= 0) {
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

      case 4: // Review Step
        return (
          get().validateStep(1) &&
          get().validateStep(2) &&
          get().validateStep(3)
        );
    }

    return true;
  },

  validateCurrentStep: () => {
    const { currentStep } = get();
    return get().validateStep(currentStep);
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

  getStepLabel: (step: number) => {
    const stepData = eventSteps.find((s) => s.step === step);
    return stepData ? stepData.label : "";
  },

  isStepComplete: (step: number) => {
    return get().validateStep(step);
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
  createEvent: async () => {
    const { formData, setLoading } = get();
    setLoading(true);

    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        eventType: formData.eventType,
        date: formData.date!.toISOString(),
        endDate: formData.endDate?.toISOString(),
        startTime: formData.startTime,
        endTime: formData.endTime || undefined,
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
          ...(ticket.quantity !== undefined && { quantity: ticket.quantity }),
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
        date: formData.date!.toISOString(),
        endDate: formData.endDate?.toISOString(),
        startTime: formData.startTime,
        endTime: formData.endTime || undefined,
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

  updateEventTickets: async (eventId: string) => {
    const { formData, setLoading } = get();
    setLoading(true);

    try {
      const ticketData = {
        ticketTypes: formData.ticketTypes.map((ticket) => ({
          id: ticket.id === "default" ? undefined : ticket.id,
          name: ticket.name,
          price: ticket.price,
          ...(ticket.quantity !== undefined && { quantity: ticket.quantity }),
        })),
      };

      const response = await fetch(`/api/events/${eventId}/ticket-type`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ticketData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update event tickets");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error updating event tickets:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  },

  loadEvent: async (eventId: string) => {
    const { setLoading, setCurrentEvent } = get();
    setLoading(true);

    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load event");
      }

      const event = await response.json();
      setCurrentEvent(event);

      const formData: EventFormData = {
        title: event.title || "",
        description: event.description || "",
        eventType: event.eventType || EventType.FREE,
        date: event.date ? new Date(event.date) : null,
        endDate: event.endDate ? new Date(event.endDate) : null,
        startTime: event.startTime || "",
        endTime: event.endTime || "",
        location: event.location || "",
        venue: event.venue || "",
        address: event.address || "",
        tags: Array.isArray(event.tags) ? event.tags : [],
        category: event.category || "",
        imageUrl: event.imageUrl || "",
        bannerImage: null,
        ticketTypes: Array.isArray(event.ticketTypes)
          ? event.ticketTypes.map((ticket: any) => ({
              id: ticket.id || `ticket_${Date.now()}`,
              name: ticket.name || "",
              price: typeof ticket.price === "number" ? ticket.price : 0,
              quantity:
                typeof ticket.quantity === "number"
                  ? ticket.quantity
                  : undefined,
            }))
          : [
              {
                id: "default",
                name: "Standard",
                price: 0,
              },
            ],
        isPublic: event.isPublic ?? true,
        status: event.status || EventStatus.DRAFT,
        slug: event.slug || "",
      };

      return event;
    } catch (error) {
      console.error("Error loading event:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  },

  loadEvents: async (params = {}) => {
    const { setEventsLoading, setEventsError, setAllEvents } = get();
    setEventsLoading(true);
    setEventsError(null);

    try {
      const searchParams = new URLSearchParams();

      // Add parameters to search params if they exist
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/events?${searchParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load events");
      }

      const result = await response.json();

      // If offset is provided, it means we're loading more events (pagination)
      if (params.offset && params.offset > 0) {
        set((state) => ({
          allEvents: [...state.allEvents, ...result.events],
        }));
      } else {
        // Otherwise, replace all events
        setAllEvents(result.events);
      }

      return {
        events: result.events,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
      };
    } catch (error) {
      console.error("Error loading events:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load events";
      setEventsError(errorMessage);
      throw error;
    } finally {
      setEventsLoading(false);
    }
  },

  setAllEvents: (events: EventData[]) => set({ allEvents: events }),

  setEventsLoading: (loading: boolean) => set({ eventsLoading: loading }),

  setEventsError: (error: string | null) => set({ eventsError: error }),

  clearEvents: () =>
    set({
      allEvents: [],
      eventsError: null,
      eventsLoading: false,
    }),
}));
