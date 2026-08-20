const express = require('express');
const XLSX = require('xlsx');
const { DB } = require('../models/db');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/reports/export
// @desc    Export inventory data to Excel sheet (.xlsx)
// @access  Private (Admin Only)
router.get('/export', verifyToken, isAdmin, async (req, res) => {
  const { site } = req.query;
  const query = {};
  if (site) query.site = site;

  try {
    const materials = await DB.Materials.find(query);

    // Format data for Excel
    const excelData = materials.map(m => {
      const row = {
        'Category': m.category,
        'Item Name': m.name,
        'Quantity': m.quantity,
        'Unit': m.unit || ''
      };
      
      // If exporting all sites, include the Site column
      if (!site) {
        row['Project Site'] = m.site;
      }
      
      return row;
    });

    // Create Excel Workbook
    const workbook = XLSX.utils.book_new();
    const sheetName = site ? `${site.substring(0, 30)} Inventory` : 'Consolidated Inventory';
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Auto-adjust column widths for better aesthetics
    const colWidths = [];
    if (excelData.length > 0) {
      const keys = Object.keys(excelData[0]);
      keys.forEach((key, colIdx) => {
        let maxLen = key.length;
        excelData.forEach(row => {
          const val = row[key] ? row[key].toString() : '';
          if (val.length > maxLen) maxLen = val.length;
        });
        colWidths.push({ wch: maxLen + 4 }); // add padding
      });
      worksheet['!cols'] = colWidths;
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = site 
      ? `Inventory_${site.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `Inventory_Consolidated_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Send buffer download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

    // Log Activity
    await DB.History.create({
      userName: req.user.name,
      action: `Exported Excel Inventory report${site ? ` for site "${site}"` : ''}`
    });

  } catch (err) {
    console.error('Excel Export Error:', err);
    res.status(500).json({ message: 'Failed to generate Excel export.' });
  }
});

module.exports = router;
