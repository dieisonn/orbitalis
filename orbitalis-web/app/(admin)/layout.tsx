import Sidebar from '@/components/layout/sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto print:p-0">
        {children}
      </main>
    </div>
  )
}
