import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// PUT - Update entry
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { date, particulars, debitCountry, debit, creditCountry, credit } = body

    if (!particulars || (!debit && !credit)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await getDatabase()
    const updateData = {
      date,
      particulars,
      debitCountry: Number(debitCountry) || 0,
      debit: Number(debit) || 0,
      creditCountry: Number(creditCountry) || 0,
      credit: Number(credit) || 0,
      updatedAt: new Date(),
    }

    const result = await db.collection("entries").updateOne({ _id: new ObjectId(id) }, { $set: updateData })

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Entry updated successfully" })
  } catch (error) {
    console.error("Error updating entry:", error)
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 })
  }
}

// DELETE - Delete entry
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const db = await getDatabase()

    const result = await db.collection("entries").deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Entry deleted successfully" })
  } catch (error) {
    console.error("Error deleting entry:", error)
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 })
  }
}
