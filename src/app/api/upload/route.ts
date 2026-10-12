import { NextRequest, NextResponse } from 'next/server';
import { parseDocumentContent, extractHierarchyAndConcepts, saveExtractedHierarchyToDb } from '@/lib/extractor';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const subjectId = formData.get('subjectId') as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    if (!subjectId) {
      return NextResponse.json({ success: false, error: 'Target subject ID is required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Parse document text while filtering boilerplate
    const cleanedText = await parseDocumentContent(buffer, file.name);

    // 2. Extract structured units and topics hierarchy
    const units = extractHierarchyAndConcepts(cleanedText);

    // 3. Persist to database
    const { unitsAdded, topicsAdded } = await saveExtractedHierarchyToDb(subjectId, units);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      unitsCount: unitsAdded,
      topicsCount: topicsAdded,
      unitsExtracted: units,
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    return NextResponse.json({ success: false, error: err.message || 'File processing failed' }, { status: 500 });
  }
}
