/* eslint-disable @typescript-eslint/no-explicit-any */

// Monaco theme that matches the app palette. Call from the editor's `beforeMount`.
export function defineMockmateTheme(monaco: any) {
    monaco.editor.defineTheme('mockmate-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': '#0e0f12',
            'editorGutter.background': '#0e0f12',
            'editor.lineHighlightBackground': '#16171b',
            'editorLineNumber.foreground': '#4a4f5a',
            'editorLineNumber.activeForeground': '#a8adb8',
            'editor.selectionBackground': '#27412f',
            'editorCursor.foreground': '#3ecf8e',
            'editorWidget.background': '#141519',
            'editorWidget.border': '#23252d',
            'editorIndentGuide.background1': '#1c1d22',
        },
    });
}
