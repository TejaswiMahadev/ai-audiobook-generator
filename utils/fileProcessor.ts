// @ts-nocheck - mammoth and pdfjs are loaded from CDN
declare const mammoth: any;
declare const pdfjsLib: any;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs';

const readAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

const readAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const processPdfFile = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let textContent = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();
        textContent += text.items.map((item: any) => item.str).join(' ');
    }
    return textContent;
};

const processDocxFile = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
};

export const processFile = async (file: File): Promise<{ type: 'text' | 'image', content: string, name: string, mimeType?: string }> => {
    const fileType = file.type;
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (fileType.startsWith('image/')) {
        const content = await readAsBase64(file);
        return { type: 'image', content, name: file.name, mimeType: file.type };
    }

    if (fileType === 'application/pdf') {
        const content = await processPdfFile(file);
        return { type: 'text', content, name: file.name };
    }

    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === 'docx') {
        const content = await processDocxFile(file);
        return { type: 'text', content, name: file.name };
    }
    
    if (fileType === 'text/plain' || extension === 'txt' || extension === 'doc') {
        const content = await readAsText(file);
        return { type: 'text', content, name: file.name };
    }

    throw new Error(`Unsupported file type: ${fileType || extension}`);
};