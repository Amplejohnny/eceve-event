import { create } from "zustand";
import { EventType, EventStatus } from "@/generated/prisma";

const timeStringToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
};

export interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}

export interface EventData {
  id: string;
  title: string;
  category: string;
  date: string;
  endDate?: string;
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
  endDate?: Date | null;
  startTime: string;
  endTime?: string;
  location: string;
  venue?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  bannerImage?: File | null;
  imageUrl: string;
  ticketTypes: TicketType[];
  isPublic: boolean;
  status: EventStatus;
  slug: string;
}

export interface EventStep {
  step: number;
  label: string;
}

export interface PopularEventsFilters {
  status?: string;
  limit?: number;
  activeFilter?: string;
}

export interface EventsFilters {
  status?: string;
  limit?: number;
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
  eventError: string | null;
  currentEvent: EventData | null;

  // Navigations
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoNext: () => boolean;
  canGoPrev: () => boolean;
  canPublish: () => boolean;

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

  //Image validation
  uploadEventImage: (file: File) => Promise<string>;

  // Validation
  validateStep: (step: number) => boolean;
  validateStepWithErrors: (step: number) => boolean;
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
  setEventError: (error: string | null) => void;

  setCurrentEvent: (event: EventData | null) => void;
  getCurrentEvent: () => EventData | null;

  // Event management
  createEvent: () => Promise<unknown>;
  updateEvent: (eventId: string) => Promise<unknown>;
  updateEventTickets: (eventId: string) => Promise<unknown>;
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

  loadPopularEvents: (filters?: PopularEventsFilters) => Promise<EventData[]>;
  loadUpcomingEvents: (filters?: EventsFilters) => Promise<EventData[]>;
  loadTrendyEvents: (filters?: EventsFilters) => Promise<EventData[]>;

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
  eventError: null,

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
    const { currentStep } = get();
    return get().validateStep(currentStep) && currentStep < eventSteps.length;
  },

  canGoPrev: () => {
    const { currentStep } = get();
    return currentStep > 1;
  },

  canPublish: () => {
    const { currentStep, validateStep } = get();
    // For the final step (step 4), validate all previous steps
    if (currentStep === 4) {
      return (
        validateStep(1) && validateStep(2) && validateStep(3) && validateStep(4)
      );
    }
    return false;
  },

  setCurrentEvent: (event: EventData | null) => set({ currentEvent: event }),

  getCurrentEvent: () => get().currentEvent,

  setEventError: (error: string | null) => set({ eventError: error }),

  // Form data management
  updateFormData: (data: Partial<EventFormData>) => {
    set((state) => {
      const newFormData = { ...state.formData, ...data };

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

  uploadEventImage: async (file: File): Promise<string> => {
    const { setLoading, setError } = get();

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload image");
      }

      const result = await response.json();
      return result.imageUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      setError(
        "imageUpload",
        error instanceof Error ? error.message : "Failed to upload image"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  },

  // Validation
  validateStep: (step: number) => {
    const { formData } = get();

    switch (step) {
      case 1: // Edit Step
        if (!formData.title.trim()) {
          return false;
        }
        if (!formData.category.trim()) {
          return false;
        }
        if (!formData.date) {
          return false;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const eventDate = new Date(formData.date);
        eventDate.setHours(0, 0, 0, 0);

        if (eventDate < today) {
          return false;
        }
        if (!formData.startTime.trim()) {
          return false;
        }

        if (formData.endTime && formData.endTime.trim()) {
          // Convert times to comparable format
          const startTimeMinutes = timeStringToMinutes(formData.startTime);
          const endTimeMinutes = timeStringToMinutes(formData.endTime);

          if (endTimeMinutes <= startTimeMinutes) {
            return false;
          }
        }

        if (!formData.location.trim()) {
          return false;
        }
        if (!formData.description.trim()) {
          return false;
        }
        if (formData.tags.length === 0) {
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
            return false;
          }

          // Check file size
          if (formData.bannerImage.size > maxSize) {
            return false;
          }

          // If we have a bannerImage, we should also have imageUrl (uploaded successfully)
          if (!formData.imageUrl) {
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
            return false;
          }
        }

        for (const ticket of formData.ticketTypes) {
          if (!ticket.name.trim()) {
            return false;
          }
          if (ticket.quantity !== undefined && ticket.quantity <= 0) {
            return false;
          }
          if (formData.eventType === EventType.PAID && ticket.price <= 0) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validateField: (field: string, value: any) => {
    const { setError, clearError } = get();

    clearError(field);

    switch (field) {
      case "title":
        if (!value || !value.trim()) {
          setError(field, "Event title is required");
          return false;
        }
        break;
      case "category":
        if (!value || !value.trim()) {
          setError(field, "Event category is required");
          return false;
        }
        break;
      case "description":
        if (!value || !value.trim()) {
          setError(field, "Event description is required");
          return false;
        }
        break;
      case "location":
        if (!value || !value.trim()) {
          setError(field, "Event location is required");
          return false;
        }
        break;
      case "startTime":
        if (!value || !value.trim()) {
          setError(field, "Start time is required");
          return false;
        }
        break;
      case "date":
        if (!value) {
          setError(field, "Event date is required");
          return false;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const eventDate = new Date(value);
        eventDate.setHours(0, 0, 0, 0);

        if (eventDate < today) {
          setError(field, "Event date cannot be in the past");
          return false;
        }
        break;
    }

    return true;
  },

  validateStepWithErrors: (step: number) => {
    const { formData, setError } = get();

    // Don't clear all errors immediately - only clear errors for fields being validated
    let hasErrors = false;

    switch (step) {
      case 1: // Edit Step
        // Clear only step 1 related errors
        const step1Fields = [
          "title",
          "category",
          "description",
          "date",
          "startTime",
          "endTime",
          "location",
          "tags",
        ];
        step1Fields.forEach((field) => get().clearError(field));

        if (!formData.title.trim()) {
          setError("title", "Event title is required");
          hasErrors = true;
        }
        if (!formData.category.trim()) {
          setError("category", "Event category is required");
          hasErrors = true;
        }
        if (!formData.date) {
          setError("date", "Event date is required");
          hasErrors = true;
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const eventDate = new Date(formData.date);
          eventDate.setHours(0, 0, 0, 0);

          if (eventDate < today) {
            setError("date", "Event date cannot be in the past");
            hasErrors = true;
          }
        }
        if (!formData.startTime.trim()) {
          setError("startTime", "Start time is required");
          hasErrors = true;
        }
        if (formData.endTime && formData.endTime.trim()) {
          const startTimeMinutes = timeStringToMinutes(formData.startTime);
          const endTimeMinutes = timeStringToMinutes(formData.endTime);

          if (endTimeMinutes <= startTimeMinutes) {
            setError("endTime", "End time must be after start time");
            hasErrors = true;
          }
        }
        if (!formData.location.trim()) {
          setError("location", "Event location is required");
          hasErrors = true;
        }
        if (!formData.description.trim()) {
          setError("description", "Event description is required");
          hasErrors = true;
        }
        if (formData.tags.length === 0) {
          setError("tags", "At least one tag is required");
          hasErrors = true;
        }
        break;

      case 2: // Banner Step
        // Clear banner related errors
        get().clearError("bannerImage");

        if (formData.bannerImage) {
          const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
          ];
          const maxSize = 5 * 1024 * 1024; // 5MB

          if (!allowedTypes.includes(formData.bannerImage.type)) {
            setError(
              "bannerImage",
              "Image must be in JPEG, PNG, or WebP format"
            );
            hasErrors = true;
          }

          if (formData.bannerImage.size > maxSize) {
            setError("bannerImage", "Image size must be less than 5MB");
            hasErrors = true;
          }

          if (!formData.imageUrl) {
            setError(
              "bannerImage",
              "Image upload not completed. Please wait for upload to finish."
            );
            hasErrors = true;
          }
        }
        break;

      case 3: // Ticketing Step
        // Clear ticket related errors
        formData.ticketTypes.forEach((ticket) => {
          get().clearError(`ticket_${ticket.id}_name`);
          get().clearError(`ticket_${ticket.id}_price`);
          get().clearError(`ticket_${ticket.id}_quantity`);
        });
        get().clearError("ticketTypes");

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
            hasErrors = true;
          }
        }

        for (const ticket of formData.ticketTypes) {
          if (!ticket.name.trim()) {
            setError(`ticket_${ticket.id}_name`, "Ticket name is required");
            hasErrors = true;
          }
          if (ticket.quantity !== undefined && ticket.quantity <= 0) {
            setError(
              `ticket_${ticket.id}_quantity`,
              "Ticket quantity must be greater than 0"
            );
            hasErrors = true;
          }
          if (formData.eventType === EventType.PAID && ticket.price <= 0) {
            setError(
              `ticket_${ticket.id}_price`,
              "Ticket price must be greater than 0 for paid events"
            );
            hasErrors = true;
          }
        }
        break;

      case 4: // Review Step
        return (
          get().validateStepWithErrors(1) &&
          get().validateStepWithErrors(2) &&
          get().validateStepWithErrors(3)
        );
    }

    return !hasErrors;
  },

  validateCurrentStep: () => {
    const { currentStep } = get();
    const isValid = get().validateStepWithErrors(currentStep);

    // Log validation result for debugging
    console.log(`Validating step ${currentStep}:`, isValid);
    if (!isValid) {
      console.log("Validation errors:", get().errors);
    }

    return isValid;
  },

  setError: (field: string, error: string) => {
    set((state) => ({
      errors: { ...state.errors, [field]: error },
    }));
  },

  clearError: (field: string) => {
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  createEvent: async (): Promise<unknown> => {
    const { formData, setLoading } = get();
    setLoading(true);

    try {
      console.log("Creating event with imageUrl:", formData.imageUrl);

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
        imageUrl: formData.imageUrl || undefined,
        ticketTypes: formData.ticketTypes.map(({ id: _id, ...ticket }) => ({
          name: ticket.name,
          price: ticket.price,
          ...(ticket.quantity !== undefined && { quantity: ticket.quantity }),
        })),
      };

      console.log("Sending event data:", eventData);

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

  updateEvent: async (eventId: string): Promise<unknown> => {
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

  updateEventTickets: async (eventId: string): Promise<unknown> => {
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
    const { setLoading, setCurrentEvent, setEventError, clearAllErrors } =
      get();

    // Clear previous state first
    setCurrentEvent(null);
    setEventError(null);
    clearAllErrors();
    setLoading(true);

    try {
      if (!eventId || eventId.trim() === "") {
        throw new Error("Event ID is required");
      }

      const response = await fetch(`/api/events/${eventId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Event not found");
        } else if (response.status === 400) {
          throw new Error("Invalid event ID format");
        } else if (response.status === 503) {
          throw new Error("Database connection error. Please try again later.");
        } else {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error occurred" }));
          throw new Error(errorData.error || "Failed to load event");
        }
      }

      const event = await response.json();

      if (!event || typeof event !== "object") {
        throw new Error("Invalid response from server");
      }

      setCurrentEvent(event);
      setEventError(null); // Clear any previous errors
      return event;
    } catch (error) {
      console.error("Error loading event:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load event";
      setEventError(errorMessage);
      setCurrentEvent(null);
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

  loadPopularEvents: async (filters = {}) => {
    const { setEventsLoading, setEventsError } = get();

    try {
      setEventsLoading(true);
      const params = new URLSearchParams({
        section: "popular",
        status: filters.status || "ACTIVE",
        limit: (filters.limit || 20).toString(),
      });

      // Apply active filter to API call
      if (filters.activeFilter && filters.activeFilter !== "all") {
        switch (filters.activeFilter) {
          case "today":
            const today = new Date();
            params.set("date", today.toISOString().split("T")[0]);
            break;
          case "tomorrow":
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
            params.set("date", tomorrow.toISOString().split("T")[0]);
            break;
          case "free":
            params.set("eventType", "FREE");
            break;
          case "paid":
            params.set("eventType", "PAID");
            break;
        }
      }

      const response = await fetch(`/api/events?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch popular events");
      }

      const data = await response.json();
      return data.events;
    } catch (error) {
      console.error("Error loading popular events:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load popular events";
      setEventsError(errorMessage);
      throw error;
    } finally {
      setEventsLoading(false);
    }
  },

  loadUpcomingEvents: async (filters = {}) => {
    const { setEventsLoading, setEventsError } = get();

    try {
      setEventsLoading(true);
      const params = new URLSearchParams({
        section: "upcoming",
        status: filters.status || "ACTIVE",
        limit: (filters.limit || 20).toString(),
      });

      const response = await fetch(`/api/events?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch upcoming events");
      }

      const data = await response.json();
      return data.events;
    } catch (error) {
      console.error("Error loading upcoming events:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load upcoming events";
      setEventsError(errorMessage);
      throw error;
    } finally {
      setEventsLoading(false);
    }
  },

  loadTrendyEvents: async (filters = {}) => {
    const { setEventsLoading, setEventsError } = get();

    try {
      setEventsLoading(true);
      const params = new URLSearchParams({
        section: "trendy",
        status: filters.status || "ACTIVE",
        limit: (filters.limit || 20).toString(),
      });

      const response = await fetch(`/api/events?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch trendy events");
      }

      const data = await response.json();
      return data.events;
    } catch (error) {
      console.error("Error loading trendy events:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load trendy events";
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
