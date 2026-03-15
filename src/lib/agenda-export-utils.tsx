import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { pdf } from "@react-pdf/renderer";
import React from "react";
import { parseMarkdownToSections, MeetingPDFDocument } from "@/components/meetings/meeting-pdf-document";

/**
 * Shared utility to trigger a browser download for a Blob
 */
export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Generates a .pdf file using the shared document component client-side
 */
export async function generateMeetingPdf(markdown: string, filename: string) {
    const sections = parseMarkdownToSections(markdown);
    const blob = await pdf(<MeetingPDFDocument sections={sections} meetingTitle={filename} />).toBlob();
    downloadBlob(blob, `${filename}.pdf`);
}

/**
 * Generates a .txt file by stripping markdown formatting
 */
export async function generateMeetingTxt(markdown: string, filename: string) {
    // Strip bold markers, dividers, and custom grid markers
    const cleanText = markdown
        .replace(/\*\*/g, "")
        .replace(/:::roles-grid/g, "")
        .replace(/:::end-grid/g, "")
        .replace(/---/g, "_________________________________________________")
        .trim();
    
    const blob = new Blob([cleanText], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${filename}.txt`);
}

/**
 * Generates a .docx file using the 'docx' library
 */
export async function generateMeetingDocx(markdown: string, filename: string) {
    const sections = parseMarkdownToSections(markdown);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = [];
    
    for (const section of sections) {
        switch (section.type) {
            case "title":
                children.push(
                    new Paragraph({
                        text: section.content ?? "",
                        heading: HeadingLevel.HEADING_1,
                        spacing: { after: 120 },
                    })
                );
                break;
            
            case "subtitle":
                children.push(
                    new Paragraph({
                        text: section.content ?? "",
                        spacing: { after: 200 },
                        alignment: AlignmentType.LEFT,
                    })
                );
                break;
            
            case "divider":
                children.push(
                    new Paragraph({
                        border: {
                            bottom: {
                                color: "D1D5DB",
                                space: 1,
                                style: BorderStyle.SINGLE,
                                size: 12,
                            },
                        },
                        spacing: { before: 200, after: 200 },
                    })
                );
                break;
            
            case "roles":
                section.roles?.forEach(role => {
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: `${role.label}: `, bold: true }),
                                new TextRun({ text: role.value }),
                            ],
                            spacing: { after: 80 },
                        })
                    );
                });
                break;
            
            case "h2":
                children.push(
                    new Paragraph({
                        text: section.content ?? "",
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 300, after: 120 },
                    })
                );
                section.items?.forEach(item => {
                    children.push(
                        new Paragraph({
                            text: `${item.title}${item.description ? ` — ${item.description}` : ""}${item.priority ? ` (${item.priority})` : ""}`,
                            bullet: { level: 0 },
                            spacing: { after: item.notes ? 40 : 80 },
                        })
                    );
                    if (item.notes) {
                        children.push(
                            new Paragraph({
                                text: item.notes,
                                indent: { left: 720 }, // roughly aligns under bullet text
                                spacing: { after: 120 },
                            })
                        );
                    }
                });
                break;
            
            case "h3":
                children.push(
                    new Paragraph({
                        text: (section.content ?? "").toUpperCase(),
                        heading: HeadingLevel.HEADING_3,
                        spacing: { before: 400, after: 120 },
                    })
                );
                break;
            
            case "procedural":
                {
                    const hasLabel = !!section.label?.trim();
                    const labelPart = hasLabel ? `${section.label}: ` : "";
                    const lines = (section.value || "").split("\n");
                    
                    children.push(
                        new Paragraph({
                            children: [
                                ...(hasLabel ? [new TextRun({ text: labelPart, bold: true })] : []),
                                new TextRun({ text: lines[0] || "" }),
                            ],
                            spacing: { after: lines.length > 1 ? 40 : 120 },
                        })
                    );

                    // Add subsequent lines (notes/scripts)
                    for (let l = 1; l < lines.length; l++) {
                      if (lines[l].trim()) {
                        children.push(
                          new Paragraph({
                            text: lines[l],
                            spacing: { after: l === lines.length - 1 ? 120 : 40 },
                            indent: { left: Math.max(720, labelPart.length * 80) }, // consistent indentation
                          })
                        );
                      }
                    }
                }
                break;
        }
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children,
        }],
    });

    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, `${filename}.docx`);
}
