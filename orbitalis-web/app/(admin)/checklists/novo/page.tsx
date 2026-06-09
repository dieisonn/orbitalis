import { ChecklistEditor } from '@/components/ui/checklist-editor'

export default function NovoChecklistPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Novo Checklist PMOC</h1>
        <p className="text-gray-500 text-sm mt-1">
          Defina os itens de manutenção que serão copiados para cada O.S. deste template.
        </p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
        <ChecklistEditor />
      </div>
    </div>
  )
}
