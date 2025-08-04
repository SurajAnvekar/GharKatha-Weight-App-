import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  PlusIcon,
  CheckIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import jsPDF from "jspdf";
// Try different import methods for autoTable
import autoTable from 'jspdf-autotable';
// Alternative import if above doesn't work
// import 'jspdf-autotable';

export default function EntryManager({ customer }) {
  const [entries, setEntries] = useState([]);
  const [archivedEntries, setArchivedEntries] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editEntry, setEditEntry] = useState(null); // null or entry object
  const [newEntry, setNewEntry] = useState({
    type: 'credit',
    date: '',
    gross_weight: '',
    melting: '',
    waistage: '',
    net_weight: ''
  });
  const [showAddForm, setShowAddForm] = useState(true);
  const [waistageMemory, setWaistageMemory] = useState("");
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  
// Updated fetchEntries function to use the existing timestamp
const fetchEntries = useCallback(async () => {
  if (!customer) return;

  setIsLoading(true);
  try {
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .eq("customer_id", customer.id)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true }); // Use your existing timestamp

    if (error) throw error;

    setEntries(data?.filter((e) => !e.archived) || []);
    setArchivedEntries(data?.filter((e) => e.archived) || []);
  } catch (error) {
    console.error("Error fetching entries:", error);
  } finally {
    setIsLoading(false);
  }
}, [customer]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Helper functions for formatting
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const formatNum = (num) => parseFloat(num || 0).toFixed(3);

  const downloadCurrentEntries = async () => {
  if (entries.length === 0) {
    alert("No current entries to download");
    return;
  }

  try {
    const doc = new jsPDF("landscape");
    
    // Check if autoTable is available
    if (typeof doc.autoTable !== 'function') {
      console.error("autoTable is not available. Trying manual setup...");
      
      // Try to manually attach autoTable if imported differently
      if (typeof autoTable === 'function') {
        doc.plugin(autoTable);
      } else {
        throw new Error("autoTable plugin is not properly loaded. Please check your jspdf-autotable installation.");
      }
    }
    
    // Add gradient background
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, 297, 210, 'F');
    
    // Add decorative header background
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 297, 45, 'F');
    
    // Company/Header info
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text("ENTRIES REPORT", 15, 25);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Customer: ${customer.name}`, 15, 32);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, 15, 38);
    
    // Reset text color for content
    doc.setTextColor(0, 0, 0);
    
    // Prepare data with safety checks
    const creditEntries = entries.filter((e) => e && e.type === "credit" && !e.archived) || [];
    const debitEntries = entries.filter((e) => e && e.type === "debit" && !e.archived) || [];
    
    const head = [["Date", "Gross Weight", "Melting", "Net Weight"]];
    
    const creditBody = creditEntries.map((e) => [
      formatDate(e.date),
      formatNum(e.gross_weight),
      e.melting || '',
      formatNum(e.net_weight),
    ]);
    
    const debitBody = debitEntries.map((e) => [
      formatDate(e.date),
      formatNum(e.gross_weight),
      e.melting || '',
      formatNum(e.net_weight),
    ]);
    
    let startY = 55;
    
    // Determine if we need to use single column layout for large datasets
    const totalEntries = creditEntries.length + debitEntries.length;
    const useSingleColumn = totalEntries > 25; // Threshold for switching to single column
    
    if (useSingleColumn) {
      // SINGLE COLUMN LAYOUT - Better for large datasets
      
      // CREDIT TABLE (Full width)
      if (creditEntries.length > 0) {
        doc.setFillColor(34, 197, 94, 0.1);
        doc.rect(10, startY - 5, 277, 12, 'F');
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(22, 163, 74);
        doc.text("CREDIT ENTRIES", 15, startY + 2);
        
        doc.autoTable({
          head: head,
          body: creditBody,
          startY: startY + 8,
          margin: { left: 14, right: 14 },
          tableWidth: 'auto',
          styles: { 
            fontSize: 9, 
            halign: "center",
            cellPadding: 3,
            lineColor: [34, 197, 94],
            lineWidth: 0.5
          },
          headStyles: { 
            fillColor: [34, 197, 94],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
          },
          alternateRowStyles: { 
            fillColor: [240, 253, 244] 
          },
          theme: "grid",
          pageBreak: 'auto',
          rowPageBreak: 'avoid',
        });
        
        const creditTotal = creditBody.reduce((sum, row) => sum + parseFloat(row[3] || 0), 0);
        const creditTableEnd = doc.lastAutoTable.finalY + 5;
        doc.setFillColor(34, 197, 94, 0.2);
        doc.rect(14, creditTableEnd, 269, 8, 'F');
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(22, 163, 74);
        doc.text(`TOTAL CREDIT: ${formatNum(creditTotal)}`, 20, creditTableEnd + 5);
        
        startY = creditTableEnd + 20; // Set start position for debit table
      }
      
      // DEBIT TABLE (Full width)
      if (debitEntries.length > 0) {
        doc.setFillColor(239, 68, 68, 0.1);
        doc.rect(10, startY - 5, 277, 12, 'F');
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text("DEBIT ENTRIES", 15, startY + 2);
        
        doc.autoTable({
          head: head,
          body: debitBody,
          startY: startY + 8,
          margin: { left: 14, right: 14 },
          tableWidth: 'auto',
          styles: { 
            fontSize: 9, 
            halign: "center",
            cellPadding: 3,
            lineColor: [239, 68, 68],
            lineWidth: 0.5
          },
          headStyles: { 
            fillColor: [239, 68, 68],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
          },
          alternateRowStyles: { 
            fillColor: [254, 242, 242] 
          },
          theme: "grid",
          pageBreak: 'auto',
          rowPageBreak: 'avoid',
        });
        
        const debitTotal = debitBody.reduce((sum, row) => sum + parseFloat(row[3] || 0), 0);
        const debitTableEnd = doc.lastAutoTable.finalY + 5;
        doc.setFillColor(239, 68, 68, 0.2);
        doc.rect(14, debitTableEnd, 269, 8, 'F');
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text(`TOTAL DEBIT: ${formatNum(debitTotal)}`, 20, debitTableEnd + 5);
      }
      
    } else {
      // DUAL COLUMN LAYOUT - Better for smaller datasets
      
      // Calculate the maximum rows to determine if tables will fit side by side
      const maxRows = Math.max(creditEntries.length, debitEntries.length);
      const estimatedHeight = 25 + (maxRows * 6) + 15; // Header + rows + total
      const availableHeight = 210 - startY - 40; // Page height - start position - footer space
      
      if (estimatedHeight > availableHeight) {
        // If tables are too tall, use single column layout
        // CREDIT TABLE (Full width)
        if (creditEntries.length > 0) {
          doc.setFillColor(34, 197, 94, 0.1);
          doc.rect(10, startY - 5, 277, 12, 'F');
          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(22, 163, 74);
          doc.text("CREDIT ENTRIES", 15, startY + 2);
          
          doc.autoTable({
            head: head,
            body: creditBody,
            startY: startY + 8,
            margin: { left: 14, right: 14 },
            tableWidth: 'auto',
            styles: { 
              fontSize: 9, 
              halign: "center",
              cellPadding: 3,
              lineColor: [34, 197, 94],
              lineWidth: 0.5
            },
            headStyles: { 
              fillColor: [34, 197, 94],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 10
            },
            alternateRowStyles: { 
              fillColor: [240, 253, 244] 
            },
            theme: "grid",
            pageBreak: 'auto',
            rowPageBreak: 'avoid',
          });
          
          const creditTotal = creditBody.reduce((sum, row) => sum + parseFloat(row[3] || 0), 0);
          const creditTableEnd = doc.lastAutoTable.finalY + 5;
          doc.setFillColor(34, 197, 94, 0.2);
          doc.rect(14, creditTableEnd, 269, 8, 'F');
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(22, 163, 74);
          doc.text(`TOTAL CREDIT: ${formatNum(creditTotal)}`, 20, creditTableEnd + 5);
          
          startY = creditTableEnd + 20;
        }
        
        // DEBIT TABLE (Full width)
        if (debitEntries.length > 0) {
          doc.setFillColor(239, 68, 68, 0.1);
          doc.rect(10, startY - 5, 277, 12, 'F');
          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(220, 38, 38);
          doc.text("DEBIT ENTRIES", 15, startY + 2);
          
          doc.autoTable({
            head: head,
            body: debitBody,
            startY: startY + 8,
            margin: { left: 14, right: 14 },
            tableWidth: 'auto',
            styles: { 
              fontSize: 9, 
              halign: "center",
              cellPadding: 3,
              lineColor: [239, 68, 68],
              lineWidth: 0.5
            },
            headStyles: { 
              fillColor: [239, 68, 68],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 10
            },
            alternateRowStyles: { 
              fillColor: [254, 242, 242] 
            },
            theme: "grid",
            pageBreak: 'auto',
            rowPageBreak: 'avoid',
          });
          
          const debitTotal = debitBody.reduce((sum, row) => sum + parseFloat(row[3] || 0), 0);
          const debitTableEnd = doc.lastAutoTable.finalY + 5;
          doc.setFillColor(239, 68, 68, 0.2);
          doc.rect(14, debitTableEnd, 269, 8, 'F');
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(220, 38, 38);
          doc.text(`TOTAL DEBIT: ${formatNum(debitTotal)}`, 20, debitTableEnd + 5);
        }
      } else {
        // Use side-by-side layout for smaller datasets
        
        // CREDIT TABLE (Left side)
        if (creditEntries.length > 0) {
          doc.setFillColor(34, 197, 94, 0.1);
          doc.rect(10, startY - 5, 135, 12, 'F');
          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(22, 163, 74);
          doc.text("CREDIT ENTRIES", 15, startY + 2);
          
          doc.autoTable({
            head: head,
            body: creditBody,
            startY: startY + 8,
            margin: { left: 14 },
            tableWidth: 130,
            styles: { 
              fontSize: 9, 
              halign: "center",
              cellPadding: 3,
              lineColor: [34, 197, 94],
              lineWidth: 0.5
            },
            headStyles: { 
              fillColor: [34, 197, 94],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 10
            },
            alternateRowStyles: { 
              fillColor: [240, 253, 244] 
            },
            theme: "grid",
            pageBreak: 'avoid', // Prevent page break within table
            rowPageBreak: 'avoid',
          });
          
          const creditTotal = creditBody.reduce((sum, row) => sum + parseFloat(row[3] || 0), 0);
          const creditTableEnd = doc.lastAutoTable.finalY + 5;
          doc.setFillColor(34, 197, 94, 0.2);
          doc.rect(14, creditTableEnd, 130, 8, 'F');
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(22, 163, 74);
          doc.text(`TOTAL CREDIT: ${formatNum(creditTotal)}`, 20, creditTableEnd + 5);
        }
        
        // DEBIT TABLE (Right side) - Start at same Y position as credit table
        if (debitEntries.length > 0) {
          doc.setFillColor(239, 68, 68, 0.1);
          doc.rect(155, startY - 5, 135, 12, 'F');
          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(220, 38, 38);
          doc.text("DEBIT ENTRIES", 160, startY + 2);
          
          doc.autoTable({
            head: head,
            body: debitBody,
            startY: startY + 8,
            margin: { left: 160 },
            tableWidth: 130,
            styles: { 
              fontSize: 9, 
              halign: "center",
              cellPadding: 3,
              lineColor: [239, 68, 68],
              lineWidth: 0.5
            },
            headStyles: { 
              fillColor: [239, 68, 68],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 10
            },
            alternateRowStyles: { 
              fillColor: [254, 242, 242] 
            },
            theme: "grid",
            pageBreak: 'avoid', // Prevent page break within table
            rowPageBreak: 'avoid',
          });
          
          const debitTotal = debitBody.reduce((sum, row) => sum + parseFloat(row[3] || 0), 0);
          const debitTableEnd = doc.lastAutoTable.finalY + 5;
          doc.setFillColor(239, 68, 68, 0.2);
          doc.rect(160, debitTableEnd, 130, 8, 'F');
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(220, 38, 38);
          doc.text(`TOTAL DEBIT: ${formatNum(debitTotal)}`, 166, debitTableEnd + 5);
        }
      }
    }
    
    // BALANCE SUMMARY
    const creditTotal = creditBody.reduce((sum, row) => sum + parseFloat(row[3] || 0), 0);
    const debitTotal = debitBody.reduce((sum, row) => sum + parseFloat(row[3] || 0), 0);
    const balance = creditTotal - debitTotal;
    
    const finalY = Math.max(doc.lastAutoTable?.finalY || 60, 60) + 20;
    
    const balanceColor = balance > 0 ? [34, 197, 94] : balance < 0 ? [239, 68, 68] : [107, 114, 128];
    const balanceText = balance > 0 ? "CREDIT BALANCE" : balance < 0 ? "DEBIT BALANCE" : "BALANCED";
    
    doc.setFillColor(balanceColor[0], balanceColor[1], balanceColor[2], 0.1);
    doc.rect(14, finalY - 5, 276, 25, 'F');
    
    doc.setDrawColor(balanceColor[0], balanceColor[1], balanceColor[2]);
    doc.setLineWidth(2);
    doc.rect(14, finalY - 5, 276, 25, 'S');
    
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
    doc.text(`FINAL BALANCE: ${formatNum(Math.abs(balance))}`, 20, finalY + 5);
    
    doc.setFontSize(12);
    doc.text(`STATUS: ${balanceText}`, 20, finalY + 12);
    
    // Footer with page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text("Generated by Entry Management System", 14, 200);
      doc.text(`Page ${i} of ${pageCount} | Report ID: ${Date.now()}`, 220, 200);
    }
    
    const timestamp = new Date().toISOString().slice(0, 10);
    doc.save(`${customer.name}_Entries_Report_${timestamp}.pdf`);
    
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert(`Error generating PDF: ${error.message}. Please check the console for details.`);
  }
};

  const handleDownloadPDF = async () => {
    if (!dateRange.start || !dateRange.end) {
      alert("Please select both start and end dates");
      return;
    }

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    const filtered = archivedEntries.filter(e => {
      const entryDate = new Date(e.date);
      return entryDate >= startDate && entryDate <= endDate;
    });

    if (filtered.length === 0) {
      alert("No archived entries found in the selected date range");
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Check if autoTable is available
      if (typeof doc.autoTable !== 'function') {
        console.error("autoTable not available for archived entries");
        throw new Error("autoTable plugin is not properly loaded");
      }
      
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 297, 'F');
      
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text("ARCHIVED ENTRIES", 10, 20);
      
      doc.setFontSize(10);
      doc.text(`Customer: ${customer.name}`, 10, 26);
      doc.text(`Period: ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`, 10, 31);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 10, 36);

      const head = [["Date", "Type", "Gross", "Melting", "Net"]];
      const body = filtered.map(e => [
        formatDate(e.date),
        e.type.charAt(0).toUpperCase() + e.type.slice(1),
        formatNum(e.gross_weight),
        e.melting || '',
        formatNum(e.net_weight)
      ]);

      doc.autoTable({ 
        head, 
        body, 
        startY: 45,
        styles: { 
          fontSize: 9,
          cellPadding: 3,
          halign: 'center'
        },
        headStyles: { 
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: { 
          fillColor: [248, 250, 252] 
        },
        theme: 'grid',
        // Enhanced for large datasets
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
      });

      const creditTotal = filtered.filter(e => e.type === 'credit').reduce((sum, e) => sum + parseFloat(e.net_weight || 0), 0);
      const debitTotal = filtered.filter(e => e.type === 'debit').reduce((sum, e) => sum + parseFloat(e.net_weight || 0), 0);
      
      const summaryY = doc.lastAutoTable.finalY + 15;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`SUMMARY`, 14, summaryY);
      doc.setFontSize(10);
      doc.text(`Total Credit: ${formatNum(creditTotal)}`, 14, summaryY + 8);
      doc.text(`Total Debit: ${formatNum(debitTotal)}`, 14, summaryY + 14);
      doc.text(`Net Balance: ${formatNum(creditTotal - debitTotal)}`, 14, summaryY + 20);

      const timestamp = new Date().toISOString().slice(0, 10);
      doc.save(`${customer.name}_ArchivedEntries_${formatDate(dateRange.start)}_to_${formatDate(dateRange.end)}_${timestamp}.pdf`);
      
    } catch (error) {
      console.error("Error generating archived PDF:", error);
      alert(`Error generating PDF: ${error.message}. Please check the console for details.`);
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.date || !newEntry.gross_weight || !newEntry.melting) return;

    setIsLoading(true);
    try {
      let netWeight;
      if (newEntry.melting.toUpperCase() === 'F') {
        netWeight = parseFloat(newEntry.gross_weight);
      } else {
        const melting = parseFloat(newEntry.melting);
        const waistage = parseFloat(newEntry.waistage || waistageMemory || "0");
        netWeight = ((melting + waistage) * parseFloat(newEntry.gross_weight)) / 100;
      }

      const { error } = await supabase
        .from("entries")
        .insert([{
          ...newEntry,
          net_weight: netWeight.toFixed(3),
          customer_id: customer.id,
          archived: false
        }]);

      if (error) throw error;

      if (newEntry.waistage) {
        setWaistageMemory(newEntry.waistage);
      }

      setNewEntry((prev) => ({
        ...prev, 
        date: '',
        gross_weight: '',
        melting: '',
        waistage: waistageMemory,
        net_weight: ''
      }));
      
      await fetchEntries();
    } catch (error) {
      console.error("Error adding entry:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    const { id, date, gross_weight, melting, waistage } = editEntry;
    let net_weight = 0;
    const gross = parseFloat(gross_weight);
    const w = parseFloat(waistage || 0);

    if (melting === "F" || melting === "f") {
      net_weight = gross;
    } else {
      const m = parseFloat(melting);
      net_weight = ((m + w) * gross) / 100;
    }

    try {
      const { error } = await supabase
        .from("entries")
        .update({
          date,
          gross_weight: gross,
          melting,
          waistage: w,
          net_weight: parseFloat(net_weight.toFixed(3))
        })
        .eq("id", id);

      if (error) throw error;

      setEditEntry(null);
      fetchEntries(); // refresh table
    } catch (err) {
      console.error("Error updating entry:", err.message);
    }
  };

  const handleArchiveEntry = async (entryId) => {
    try {
      const { error } = await supabase
        .from("entries")
        .update({ archived: true })
        .eq("id", entryId);

      if (error) throw error;
      await fetchEntries();
    } catch (error) {
      console.error("Error archiving entry:", error);
    }
  };

  const handleRestoreEntries = async (entriesToRestore) => {
    const ids = entriesToRestore.map((e) => e.id);
    try {
      const { error } = await supabase
        .from("entries")
        .update({ archived: false })
        .in("id", ids);

      if (error) throw error;

      alert("Entries restored!");
      fetchEntries();
    } catch (error) {
      console.error("Restore failed:", error);
    }
  };

  const rolloverToOpposite = async () => {
    const creditTotal = entries
      .filter(e => e.type === 'credit' && !e.archived)
      .reduce((sum, e) => sum + parseFloat(e.net_weight || 0), 0);
    const debitTotal = entries
      .filter(e => e.type === 'debit' && !e.archived)
      .reduce((sum, e) => sum + parseFloat(e.net_weight || 0), 0);
    const balance = creditTotal - debitTotal;

    if (balance === 0) {
      alert("Balance is zero. Nothing to roll over.");
      return;
    }

    const type = balance > 0 ? "debit" : "credit";
    const netWeight = Math.abs(balance).toFixed(3);

    try {
      setIsLoading(true);

      const { error: insertError } = await supabase
        .from("entries")
        .insert([{
          customer_id: customer.id,
          date: new Date().toISOString().split("T")[0],
          gross_weight: netWeight,
          melting: "F",
          waistage: null,
          net_weight: netWeight,
          type,
          archived: false
        }]);

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from("entries")
        .delete()
        .eq("customer_id", customer.id)
        .eq("archived", false)
        .neq("net_weight", netWeight);

      if (deleteError) throw deleteError;

      alert(`Balance rolled over as new ${type} entry and old entries cleared.`);
      await fetchEntries();
    } catch (err) {
      console.error("Error during rollover to opposite:", err.message);
      alert("Failed to roll over balance.");
    } finally {
      setIsLoading(false);
    }
  };

  const getBalance = () => {
    const creditTotal = entries
      .filter(entry => entry.type === 'credit')
      .reduce((sum, entry) => sum + parseFloat(entry.net_weight || 0), 0);
    const debitTotal = entries
      .filter(entry => entry.type === 'debit')
      .reduce((sum, entry) => sum + parseFloat(entry.net_weight || 0), 0);

    return creditTotal - debitTotal;
  };

  const balance = getBalance();

  const renderEntriesTable = (entriesData, type, isArchived = false) => {
    const filteredEntries = entriesData.filter(entry => entry.type === type);
    const total = filteredEntries.reduce((sum, entry) => sum + parseFloat(entry.net_weight || 0), 0);

    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className={`px-4 py-3 ${type === 'credit' ? 'bg-green-50' : 'bg-red-50'} border-b border-slate-200`}>
          <h4 className={`font-medium capitalize ${type === 'credit' ? 'text-green-800' : 'text-red-800'}`}>
            {type} Entries {isArchived ? '(Archived)' : ''}
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Gross</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Melting</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Net</th>
                {!isArchived && <th className="px-4 py-3 text-left font-medium text-slate-700">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                  <td className="px-4 py-3">{parseFloat(entry.gross_weight || 0).toFixed(3)}</td>
                  <td className="px-4 py-3">{entry.melting || ''}</td>
                  <td className="px-4 py-3 font-medium">{parseFloat(entry.net_weight || 0).toFixed(3)}</td>
                  {!isArchived && (
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditEntry(entry)}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          title="Edit entry"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchiveEntry(entry.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          title="Archive entry"
                        >
                          <ArchiveBoxIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              <tr className={`font-bold ${type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                <td className="px-4 py-3" colSpan={3}>Total</td>
                <td className="px-4 py-3">{total.toFixed(3)}</td>
                {!isArchived && <td className="px-4 py-3"></td>}
              </tr>
            </tbody>
          </table>
        </div>
        {isArchived && filteredEntries.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
            <button
              onClick={() => handleRestoreEntries(filteredEntries)}
              className="inline-flex items-center space-x-2 text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>Restore All {type} Entries</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-800">
            {customer.name} - Entries
          </h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              <PlusIcon className="w-4 h-4" />
              <span>{showAddForm ? 'Hide Form' : 'Add Entry'}</span>
            </button>
            <button
              onClick={downloadCurrentEntries}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={rolloverToOpposite}
              className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              title="Clear all entries and carry balance forward to opposite side"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>Clear & Rollover</span>
            </button>
          </div>
        </div>

        {/* Balance Display */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="text-center">
            <div className="text-sm opacity-90">Current Balance</div>
            <div className="text-2xl font-bold">
              {balance > 0 ? '+' : ''}{balance.toFixed(3)}
            </div>
            <div className="text-xs opacity-75">
              {balance > 0 ? 'Credit Balance' : balance < 0 ? 'Debit Balance' : 'Balanced'}
            </div>
          </div>
        </div>

        {/* Add Entry Form */}
        {showAddForm && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-lg font-medium mb-4">Add New Entry</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={newEntry.type}
                  onChange={(e) => setNewEntry({...newEntry, type: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gross Weight</label>
                <input
                  type="number"
                  step="0.001"
                  value={newEntry.gross_weight}
                  onChange={(e) => setNewEntry({...newEntry, gross_weight: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Melting</label>
                <input
                  type="text"
                  value={newEntry.melting}
                  onChange={(e) => setNewEntry({ ...newEntry, melting: e.target.value.trim() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Waistage {waistageMemory && <span className="text-xs text-slate-500">(Last: {waistageMemory})</span>}
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={newEntry.waistage}
                  placeholder={waistageMemory || "0.000"}
                  onChange={(e) => setNewEntry({ ...newEntry, waistage: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleAddEntry}
                disabled={isLoading || !newEntry.date || !newEntry.gross_weight || !newEntry.melting}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                <CheckIcon className="w-4 h-4" />
                <span>Add Entry</span>
              </button>
            </div>
          </div>
        )}

        {/* Toggle Archived Entries */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-sm text-indigo-600 hover:underline"
          >
            {showArchived ? "Hide Archived Entries" : "Show Archived Entries"}
          </button>
        </div>

        {/* Date Range and PDF Download - Only show when archived entries are visible */}
        {showArchived && archivedEntries.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-3">Download Archived Entries PDF</h4>
            <div className="flex items-center space-x-3">
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="pt-6">
                <button
                  onClick={handleDownloadPDF}
                  disabled={!dateRange.start || !dateRange.end}
                  className="inline-flex items-center space-x-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Entry Modal */}
      {editEntry && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Edit Entry</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={editEntry.date?.split("T")[0]}
                  onChange={(e) => setEditEntry({ ...editEntry, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gross Weight</label>
                <input
                  type="number"
                  step="0.001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={editEntry.gross_weight}
                  onChange={(e) => setEditEntry({ ...editEntry, gross_weight: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Melting</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={editEntry.melting}
                  onChange={(e) => setEditEntry({ ...editEntry, melting: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Waistage</label>
                <input
                  type="number"
                  step="0.001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={editEntry.waistage || ''}
                  onChange={(e) => setEditEntry({ ...editEntry, waistage: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setEditEntry(null)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            <span className="text-slate-500">Loading entries...</span>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderEntriesTable(entries, 'credit')}
              {renderEntriesTable(entries, 'debit')}
            </div>

            {showArchived && archivedEntries.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-slate-700 mb-4">Archived Entries</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {renderEntriesTable(archivedEntries, 'credit', true)}
                  {renderEntriesTable(archivedEntries, 'debit', true)}
                </div>
              </div>
            )}

            {entries.length === 0 && !isLoading && (
              <div className="text-center py-8 text-slate-500">
                <ArchiveBoxIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No entries found for this customer.</p>
                <p className="text-sm">Click "Add Entry" to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}