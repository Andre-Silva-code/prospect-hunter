import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/api-spec";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(openApiSpec);
}
