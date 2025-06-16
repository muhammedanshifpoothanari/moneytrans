"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, ArrowLeft, Search, Download, Share, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"

interface AccountEntry {
  id: string
  date: string
  particulars: string
  debitCountry: number
  debit: number
  creditCountry: number
  credit: number
  balance: number
}

type ViewMode = "statement" | "add" | "edit" | "export"

export function AccountStatement() {
  const [entries, setEntries] = useState<AccountEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentView, setCurrentView] = useState<ViewMode>("statement")
  const [editingEntry, setEditingEntry] = useState<AccountEntry | null>(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    particulars: "",
    debitCountry: "",
    debit: "",
    creditCountry: "",
    credit: "",
  })
  const [exportFilters, setExportFilters] = useState({
    particulars: "",
    startDate: "",
    endDate: "",
  })
  const [filteredEntries, setFilteredEntries] = useState<AccountEntry[]>([])
  const { toast } = useToast()

  // Fetch entries from database
  const fetchEntries = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/entries")
      if (!response.ok) throw new Error("Failed to fetch entries")
      const data = await response.json()
      setEntries(data)
    } catch (error) {
      console.error("Error fetching entries:", error)
      toast({
        title: "Error",
        description: "Failed to fetch entries from database",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [])

  const resetFormData = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      particulars: "",
      debitCountry: "",
      debit: "",
      creditCountry: "",
      credit: "",
    })
  }

  const handleAddEntry = async () => {
    if (!formData.particulars || (!formData.debit && !formData.credit)) {
      toast({
        title: "Validation Error",
        description: "Please fill in particulars and at least one amount field",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to create entry")

      toast({
        title: "Success",
        description: "Entry added successfully",
      })

      resetFormData()
      setEditingEntry(null)
      setCurrentView("statement")
      await fetchEntries() // Refresh entries
    } catch (error) {
      console.error("Error adding entry:", error)
      toast({
        title: "Error",
        description: "Failed to add entry",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditEntry = async () => {
    if (!editingEntry || !formData.particulars || (!formData.debit && !formData.credit)) {
      toast({
        title: "Validation Error",
        description: "Please fill in particulars and at least one amount field",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/entries/${editingEntry.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to update entry")

      toast({
        title: "Success",
        description: "Entry updated successfully",
      })

      setEditingEntry(null)
      resetFormData()
      setCurrentView("statement")
      await fetchEntries() // Refresh entries
    } catch (error) {
      console.error("Error updating entry:", error)
      toast({
        title: "Error",
        description: "Failed to update entry",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return

    try {
      const response = await fetch(`/api/entries/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete entry")

      toast({
        title: "Success",
        description: "Entry deleted successfully",
      })

      await fetchEntries() // Refresh entries
    } catch (error) {
      console.error("Error deleting entry:", error)
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      })
    }
  }

  const startEdit = (entry: AccountEntry) => {
    setEditingEntry(entry)
    setFormData({
      date: entry.date,
      particulars: entry.particulars,
      debitCountry: entry.debitCountry.toString(),
      debit: entry.debit.toString(),
      creditCountry: entry.creditCountry.toString(),
      credit: entry.credit.toString(),
    })
    setCurrentView("edit")
  }

  const handleSearch = () => {
    let filtered = [...entries]

    if (exportFilters.particulars) {
      filtered = filtered.filter((entry) =>
        entry.particulars.toLowerCase().includes(exportFilters.particulars.toLowerCase()),
      )
    }

    if (exportFilters.startDate) {
      filtered = filtered.filter((entry) => entry.date >= exportFilters.startDate)
    }

    if (exportFilters.endDate) {
      filtered = filtered.filter((entry) => entry.date <= exportFilters.endDate)
    }

    setFilteredEntries(filtered)
  }

  const exportToCSV = () => {
    const dataToExport = filteredEntries.length > 0 ? filteredEntries : entries
    const csvContent = [
      ["Date", "Particulars", "Debit Country", "Debit (Out)", "Credit Country", "Credit (In)", "Balance"],
      ...dataToExport.map((entry) => [
        entry.date,
        entry.particulars,
        entry.debitCountry || "-",
        entry.debit || "-",
        entry.creditCountry || "-",
        entry.credit || "-",
        entry.balance,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "account-statement.csv"
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Success",
      description: "Statement exported to CSV successfully",
    })
  }

  const shareViaWhatsApp = () => {
    const dataToShare = filteredEntries.length > 0 ? filteredEntries : entries
    let message = "Account Statement:\n\n"

    dataToShare.forEach((entry) => {
      message += `${entry.date} | ${entry.particulars} | `
      message += `Debit Country: ${entry.debitCountry || "-"} | Debit: ${entry.debit || "-"} | `
      message += `Credit Country: ${entry.creditCountry || "-"} | Credit: ${entry.credit || "-"} | `
      message += `Balance: ${entry.balance}\n`
    })

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")

    toast({
      title: "Success",
      description: "Statement shared via WhatsApp",
    })
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB")
  }

  if (loading) {
    return (
      <Card className="max-w-6xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading account statement...</span>
        </CardContent>
      </Card>
    )
  }

  if (currentView === "add") {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center space-y-0 pb-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentView("statement")} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl font-bold">Add New Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="particulars">Particulars</Label>
            <Input
              id="particulars"
              placeholder="Person name or identifier"
              value={formData.particulars}
              onChange={(e) => setFormData({ ...formData, particulars: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="debit-country">Debit Country Amount</Label>
              <Input
                id="debit-country"
                type="number"
                placeholder="0.00"
                value={formData.debitCountry}
                onChange={(e) => setFormData({ ...formData, debitCountry: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="debit">Debit (Out)</Label>
              <Input
                id="debit"
                type="number"
                placeholder="0.00"
                value={formData.debit}
                onChange={(e) => setFormData({ ...formData, debit: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="credit-country">Credit Country Amount</Label>
              <Input
                id="credit-country"
                type="number"
                placeholder="0.00"
                value={formData.creditCountry}
                onChange={(e) => setFormData({ ...formData, creditCountry: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="credit">Credit (In)</Label>
              <Input
                id="credit"
                type="number"
                placeholder="0.00"
                value={formData.credit}
                onChange={(e) => setFormData({ ...formData, credit: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={handleAddEntry} className="flex-1" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Entry"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                resetFormData()
                setEditingEntry(null)
                setCurrentView("statement")
              }}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (currentView === "edit") {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center space-y-0 pb-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentView("statement")} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl font-bold">Edit Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="particulars">Particulars</Label>
            <Input
              id="particulars"
              value={formData.particulars}
              onChange={(e) => setFormData({ ...formData, particulars: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="debit-country">Debit Country Amount</Label>
              <Input
                id="debit-country"
                type="number"
                value={formData.debitCountry}
                onChange={(e) => setFormData({ ...formData, debitCountry: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="debit">Debit (Out)</Label>
              <Input
                id="debit"
                type="number"
                value={formData.debit}
                onChange={(e) => setFormData({ ...formData, debit: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="credit-country">Credit Country Amount</Label>
              <Input
                id="credit-country"
                type="number"
                value={formData.creditCountry}
                onChange={(e) => setFormData({ ...formData, creditCountry: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="credit">Credit (In)</Label>
              <Input
                id="credit"
                type="number"
                value={formData.credit}
                onChange={(e) => setFormData({ ...formData, credit: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={handleEditEntry} className="flex-1" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update Entry"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                resetFormData()
                setEditingEntry(null)
                setCurrentView("statement")
              }}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (currentView === "export") {
    return (
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="flex flex-row items-center space-y-0 pb-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentView("statement")} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl font-bold">Export / Share Statement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="particulars-filter">Particulars</Label>
              <Input
                id="particulars-filter"
                placeholder="Search person or reference"
                value={exportFilters.particulars}
                onChange={(e) => setExportFilters({ ...exportFilters, particulars: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={exportFilters.startDate}
                onChange={(e) => setExportFilters({ ...exportFilters, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={exportFilters.endDate}
                onChange={(e) => setExportFilters({ ...exportFilters, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-center">
            <Button onClick={handleSearch} className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Filtered Results</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Date</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead>Debit Country</TableHead>
                    <TableHead>Debit (Out)</TableHead>
                    <TableHead>Credit Country</TableHead>
                    <TableHead>Credit (In)</TableHead>
                    <TableHead>Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(filteredEntries.length > 0 ? filteredEntries : entries).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.date)}</TableCell>
                      <TableCell>{entry.particulars}</TableCell>
                      <TableCell className="text-red-600">
                        {entry.debitCountry ? formatCurrency(entry.debitCountry) : "-"}
                      </TableCell>
                      <TableCell className="text-red-600">{entry.debit ? formatCurrency(entry.debit) : "-"}</TableCell>
                      <TableCell className="text-green-600">
                        {entry.creditCountry ? formatCurrency(entry.creditCountry) : "-"}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {entry.credit ? formatCurrency(entry.credit) : "-"}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(entry.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export to CSV
            </Button>
            <Button onClick={shareViaWhatsApp} className="bg-green-600 hover:bg-green-700 flex items-center gap-2">
              <Share className="h-4 w-4" />
              Share via WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-3xl font-bold">Account Statement</CardTitle>
        <Button
          onClick={() => {
            resetFormData()
            setEditingEntry(null)
            setCurrentView("add")
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden mb-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Date</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead>Debit Country</TableHead>
                <TableHead>Debit (Out)</TableHead>
                <TableHead>Credit Country</TableHead>
                <TableHead>Credit (In)</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell>{entry.particulars}</TableCell>
                  <TableCell className="text-red-600">
                    {entry.debitCountry ? formatCurrency(entry.debitCountry) : "-"}
                  </TableCell>
                  <TableCell className="text-red-600">{entry.debit ? formatCurrency(entry.debit) : "-"}</TableCell>
                  <TableCell className="text-green-600">
                    {entry.creditCountry ? formatCurrency(entry.creditCountry) : "-"}
                  </TableCell>
                  <TableCell className="text-green-600">{entry.credit ? formatCurrency(entry.credit) : "-"}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(entry.balance)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(entry)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="bg-red-500 hover:bg-red-600 text-white border-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-center">
          <Button
            onClick={() => setCurrentView("export")}
            className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
          >
            <Share className="h-4 w-4" />
            Export / Share
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
