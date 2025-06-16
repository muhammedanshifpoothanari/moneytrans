import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export interface AccountEntry {
  _id?: string
  id?: string
  date: string
  particulars: string
  debitCountry: number
  debit: number
  creditCountry: number
  credit: number
  balance: number
  createdAt?: Date
  updatedAt?: Date
}

// GET - Fetch all entries
export async function GET() {
  try {
    const db = await getDatabase()
    const entries = await db.collection("entries").find({}).sort({ date: 1 }).toArray()

    // Convert MongoDB _id to id and calculate running balance
    let runningBalance = 0
    const processedEntries = entries.map((entry) => {
      runningBalance = runningBalance + entry.credit - entry.debit
      return {
        ...entry,
        id: entry._id.toString(),
        balance: runningBalance,
        _id: undefined,
      }
    })

    return NextResponse.json(processedEntries)
  } catch (error) {
    console.error("Error fetching entries:", error)
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 })
  }
}

// POST - Create new entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, particulars, debitCountry, debit, creditCountry, credit } = body

    if (!particulars || (!debit && !credit)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await getDatabase()
    const newEntry = {
      date,
      particulars,
      debitCountry: Number(debitCountry) || 0,
      debit: Number(debit) || 0,
      creditCountry: Number(creditCountry) || 0,
      credit: Number(credit) || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("entries").insertOne(newEntry)

    return NextResponse.json(
      {
        ...newEntry,
        id: result.insertedId.toString(),
        _id: undefined,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating entry:", error)
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 })
  }
}
