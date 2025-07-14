// import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth-config";
// import { createEvent } from "@/lib/event";
// import { z } from "zod";

// const createEventSchema = z.object({
//   title: z.string().min(1),
//   description: z.string().min(1),
//   eventType: z.enum(["FREE", "PAID"]),
//   date: z.string().transform((str) => new Date(str)),
//   endDate: z
//     .string()
//     .optional()
//     .transform((str) => (str ? new Date(str) : undefined)),
//   location: z.string().min(1),
//   venue: z.string().optional(),
//   address: z.string().optional(),
//   latitude: z.number().optional(),
//   longitude: z.number().optional(),
//   tags: z.array(z.string()),
//   category: z.string().optional(),
//   imageUrl: z.string().optional(),
//   ticketTypes: z.array(
//     z.object({
//       name: z.string().min(1),
//       price: z.number().min(0),
//       quantity: z.number().min(1),
//     })
//   ),
//   maxAttendees: z.number().optional(),
//   slug: z.string().min(1),
// });

// export async function POST(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);

//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const body = await request.json();
//     const validatedData = createEventSchema.parse(body);

//     // Use the event library function
//     const event = await createEvent({
//       ...validatedData,
//       organizerId: session.user.id,
//     });

//     return NextResponse.json(event, { status: 201 });
//   } catch (error) {
//     console.error("Error creating event:", error);

//     if (error instanceof z.ZodError) {
//       return NextResponse.json(
//         { error: "Invalid input", details: error.errors },
//         { status: 400 }
//       );
//     }

//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }
