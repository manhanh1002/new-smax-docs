import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Test connection by checking session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  // Test database connection (documents table)
  // We use count option to check connection without needing data
  const { count, error: dbError } = await supabase.from('documents').select('*', { count: 'exact', head: true })

  return (
    <div className="p-10 font-sans">
      <h1 className="text-2xl font-bold mb-6">Supabase Connection Test</h1>
      
      <div className="grid gap-6 max-w-2xl">
        <div className={`p-6 border rounded-lg ${sessionError ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <h2 className="font-semibold text-lg mb-2">Auth Service</h2>
          <div className="space-y-2">
            <p><strong>Status:</strong> {sessionError ? 'Error' : 'Connected'}</p>
            {sessionError && <p className="text-red-600 break-all">{sessionError.message}</p>}
            {!sessionError && <p className="text-green-700">Session: {session ? 'Active User' : 'No Session (Anonymous)'}</p>}
          </div>
        </div>

        <div className={`p-6 border rounded-lg ${dbError ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <h2 className="font-semibold text-lg mb-2">Database Service (documents table)</h2>
          <div className="space-y-2">
            <p><strong>Status:</strong> {dbError ? 'Error' : 'Connected'}</p>
            {dbError && (
              <div className="text-red-600">
                <p className="font-medium">{dbError.message}</p>
                <p className="text-sm mt-1 opacity-75">Hint: If "relation does not exist", run the migration script.</p>
              </div>
            )}
            {!dbError && <p className="text-green-700">Found {count} documents</p>}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border rounded text-sm text-gray-600">
          <p>Environment:</p>
          <ul className="list-disc ml-5 mt-1">
            <li>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</li>
            <li>Key Configured: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Yes' : 'No'}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
