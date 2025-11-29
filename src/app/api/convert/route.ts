import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import os from "os";

export async function POST(req: NextRequest) {
  const tempDir = os.tmpdir();
  // Using a timestamp to avoid filename collisions
  const timestamp = Date.now();
  const inputPath = path.join(tempDir, `input-${timestamp}.pdf`);
  const outputPath = path.join(tempDir, `output-${timestamp}.docx`);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // 1. Write the file
    await writeFile(inputPath, buffer);

    // 2. Determine script path
    const scriptPath = path.resolve(process.cwd(), "scripts/pdf_to_docx.py");
    console.log("📂 Script Path:", scriptPath); // Debug log

    // 3. Spawn Python process
    // TRY "python3" IF "python" FAILS
    const pythonProcess = spawn("python", [scriptPath, inputPath, outputPath]);

    let errorOutput = "";

    // Collect error messages from Python
    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    const exitCode = await new Promise((resolve) => {
      pythonProcess.on("close", (code) => resolve(code));
    });

    if (exitCode !== 0) {
        console.error("❌ Python Script Failed:", errorOutput);
        throw new Error(`Python conversion failed: ${errorOutput}`);
    }

    // 4. Read the result
    const docxBuffer = await readFile(outputPath);

    // 5. Cleanup
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="converted.docx"`,
      },
    });

  } catch (error: any) {
    // Cleanup on error
    await unlink(inputPath).catch(() => {}); 
    
    console.error("🚨 SERVER ERROR:", error.message);
    
    return NextResponse.json(
      { error: error.message || "Internal Server Error" }, 
      { status: 500 }
    );
  }
}