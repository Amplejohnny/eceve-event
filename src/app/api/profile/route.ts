import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";
import { updateUser } from "@/lib/auth";
import { z } from "zod";

// Validation schema for profile updates
const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .optional(),
  bio: z.string().max(500, "Bio too long").optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  location: z.string().max(100, "Location too long").optional(),
  twitter: z.string().max(50, "Twitter handle too long").optional(),
  instagram: z.string().max(50, "Instagram handle too long").optional(),
  role: z.enum(["USER", "ORGANIZER"]).optional(),
  image: z.string().optional(),
});

// GET - Fetch user profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is verified
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        bio: true,
        website: true,
        location: true,
        twitter: true,
        instagram: true,
        role: true,
        emailVerified: true,
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Email verification required" },
        { status: 403 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 }
      );
    }

    // Return user profile data
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name || "",
        image: user.image || "",
        bio: user.bio || "",
        website: user.website || "",
        location: user.location || "",
        twitter: user.twitter || "",
        instagram: user.instagram || "",
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is verified
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        isActive: true,
        role: true,
        website: true,
        twitter: true,
        instagram: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Email verification required" },
        { status: 403 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = profileUpdateSchema.parse(body);

    // Check if user is trying to change to ORGANIZER role
    if (validatedData.role === "ORGANIZER" && user.role !== "ORGANIZER") {
      // Check social proof requirements
      const socialProofs = [
        validatedData.website || user.website,
        validatedData.twitter || user.twitter,
        validatedData.instagram || user.instagram,
      ].filter(Boolean);

      if (socialProofs.length < 2) {
        return NextResponse.json(
          {
            error: "Social proof required",
            message:
              "Please provide at least 2 social proof fields (Website, Twitter, or Instagram) to become an organizer",
          },
          { status: 400 }
        );
      }
    }

    // Prevent users from changing role if they're already ORGANIZER or ADMIN
    if (user.role === "ORGANIZER" || user.role === "ADMIN") {
      delete validatedData.role;
    }

    // Update user profile
    const updatedUser = await updateUser(session.user.id, validatedData);

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name || "",
        image: updatedUser.image || "",
        bio: updatedUser.bio || "",
        website: updatedUser.website || "",
        location: updatedUser.location || "",
        twitter: updatedUser.twitter || "",
        instagram: updatedUser.instagram || "",
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Error updating user profile:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is verified
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        emailVerified: true,
        isActive: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Email verification required" },
        { status: 403 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { field, value } = body;

    if (!field) {
      return NextResponse.json({ error: "Field is required" }, { status: 400 });
    }

    // Validate allowed fields
    const allowedFields = [
      "name",
      "bio",
      "website",
      "location",
      "twitter",
      "instagram",
      "image",
    ];
    if (!allowedFields.includes(field)) {
      return NextResponse.json({ error: "Invalid field" }, { status: 400 });
    }

    // Validate field value
    const fieldValidation = profileUpdateSchema.pick({ [field]: true });
    const validatedData = fieldValidation.parse({ [field]: value });

    // Update specific field
    const updatedUser = await updateUser(session.user.id, validatedData);

    return NextResponse.json({
      success: true,
      message: `${field} updated successfully`,
      data: {
        [field]: updatedUser[field as keyof typeof updatedUser],
      },
    });
  } catch (error) {
    console.error("Error updating profile field:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update profile field" },
      { status: 500 }
    );
  }
}



useEffect(() => {
  const loadProfileData = async () => {
    try {
      const response = await fetch('/api/profile');
      const data = await response.json();
      
      if (response.ok) {
        setProfileData(data.data);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  loadProfileData();
}, []);