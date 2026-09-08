import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (!process.env.DEEPGRAM_API_KEY) {
    return NextResponse.json({ error: "voice input is not configured (DEEPGRAM_API_KEY missing)" }, { status: 501 });
  }

  const audio = await req.arrayBuffer();
  const contentType = req.headers.get("content-type") || "audio/webm";

  const res = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": contentType,
      },
      body: audio,
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: `Deepgram error ${res.status}: ${await res.text()}` }, { status: 502 });
  }

  const data = await res.json();
  const transcript: string = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
  return NextResponse.json({ transcript });
}
