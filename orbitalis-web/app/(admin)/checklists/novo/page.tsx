import { ChecklistEditor } from '@/components/ui/checklist-editor'

export default function NovoChecklistPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Novo Checklist PMOC</h1>
        <p className="text-gray-500 text-sm mt-1">
          Defina os itens de manutenção que serão copiados para cada O.S. deste template.
        </p>
      </div>
      <div className="bg-white rounded-xl p-6 border border-border">
        <ChecklistEditor />
      </div>
    </div>
  )
}
