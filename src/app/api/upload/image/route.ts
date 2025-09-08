import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "No file received" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop();
    const fileName = `event-${timestamp}-${randomString}.${fileExtension}`;

    // Initialize Supabase client (use service role key for server-side)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Convert file to buffer (Supabase expects ArrayBuffer or Blob)
    const arrayBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("events")
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("events")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    console.log("Image uploaded successfully:", {
      fileName,
      size: file.size,
      type: file.type,
      url: imageUrl,
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      fileName,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Internal server error during image upload" },
      { status: 500 }
    );
  }
}
