type Props = { onSelect: (sheetId: string) => void };

const SHEETS = [
  { id: "1", label: "Tink" },
  { id: "2", label: "Formik" },
  { id: "3", label: "Jacob" },
];

export function SheetSelector({ onSelect }: Props) {
  return (
    <>
      {SHEETS.map((sheet) => (
        <button key={sheet.id} onClick={() => onSelect(sheet.id)}>
          {sheet.label}
        </button>
      ))}
    </>
  );
}
