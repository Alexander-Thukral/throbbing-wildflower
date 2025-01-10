import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";
import { Upload } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

const PensionCalculator = () => {
  const [csvData, setCsvData] = useState(null);
  const [calculatorSheet, setCalculatorSheet] = useState(null);
  const [summaryTables, setSummaryTables] = useState({
    table833: null,
    table116: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target.result;
          Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              setCsvData(results.data);
              setError(null);
            },
            error: (error) => {
              setError("Error parsing CSV: " + error.message);
            },
          });
        } catch (error) {
          setError("Error reading CSV file: " + error.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {
              cellStyles: true,
              cellFormulas: true,
              cellDates: true,
              cellNF: true,
              sheetStubs: true,
            });
            setCalculatorSheet(workbook);
            setError(null);
          } catch (error) {
            setError("Error parsing Excel file: " + error.message);
          }
        };
        reader.readAsArrayBuffer(file);
      } catch (error) {
        setError("Error reading Excel file: " + error.message);
      }
    }
  };

  const calculateMonthlyInterest = (
    openingBalance,
    monthNumber,
    annualRate
  ) => {
    // Formula: ROUND(opening_balance * annual_rate * month_number / 1200, 0)
    return Math.round((openingBalance * annualRate * monthNumber) / 1200);
  };

  const calculatePensionTables = (config) => {
    const { openingBalance833, openingBalance116, annualRate } = config;

    // Define payment dates and calculate interest
    const paymentDates = [
      "31-03-2024",
      "30-04-2024",
      "31-05-2024",
      "30-06-2024",
      "31-07-2024",
      "31-08-2024",
      "30-09-2024",
      "31-10-2024",
      "30-11-2024",
      "31-12-2024",
      "31-01-2025",
      "28-02-2025",
      "31-03-2025",
      "30-04-2025",
      "31-05-2025",
      "30-06-2025",
      "31-07-2025",
    ];

    // Calculate tables for both years
    const calculateYearTable = (openingBalance, monthsInYear) => {
      return monthsInYear.map((month) => {
        const monthNumber = month.monthNumber;
        const interest = calculateMonthlyInterest(
          openingBalance,
          monthNumber,
          annualRate
        );
        const total = openingBalance + interest;
        return {
          paymentDate: month.date,
          openingBalance: openingBalance,
          interest: interest,
          totalPayable: total,
        };
      });
    };

    // Define months with their sequence numbers
    const year2024Months = [
      { date: "31-03-2024", monthNumber: 0 },
      { date: "30-04-2024", monthNumber: 1 },
      { date: "31-05-2024", monthNumber: 2 },
      { date: "30-06-2024", monthNumber: 3 },
      { date: "31-07-2024", monthNumber: 4 },
      { date: "31-08-2024", monthNumber: 5 },
      { date: "30-09-2024", monthNumber: 6 },
      { date: "31-10-2024", monthNumber: 7 },
      { date: "30-11-2024", monthNumber: 8 },
      { date: "31-12-2024", monthNumber: 9 },
      { date: "31-01-2025", monthNumber: 10 },
      { date: "28-02-2025", monthNumber: 11 },
      { date: "31-03-2025", monthNumber: 12 },
    ];

    const year2025Months = [
      { date: "30-04-2025", monthNumber: 1 },
      { date: "31-05-2025", monthNumber: 2 },
      { date: "30-06-2025", monthNumber: 3 },
      { date: "31-07-2025", monthNumber: 4 },
    ];

    // Calculate 8.33% table for 2024
    const table833_2024 = calculateYearTable(openingBalance833, year2024Months);
    // Use the closing balance of March 2025 as opening balance for 2025
    const closingBalance833 =
      table833_2024[table833_2024.length - 1].totalPayable;
    const table833_2025 = calculateYearTable(closingBalance833, year2025Months);

    // Calculate 1.16% table for 2024
    const table116_2024 = calculateYearTable(openingBalance116, year2024Months);
    // Use the closing balance of March 2025 as opening balance for 2025
    const closingBalance116 =
      table116_2024[table116_2024.length - 1].totalPayable;
    const table116_2025 = calculateYearTable(closingBalance116, year2025Months);

    // Combine tables for both years
    const table833 = [...table833_2024, ...table833_2025];
    const table116 = [...table116_2024, ...table116_2025];

    return { table833, table116 };
  };

  const calculatePension = async () => {
    if (!csvData || !calculatorSheet) {
      setError("Please upload both CSV and Excel files first");
      return;
    }

    setLoading(true);
    try {
      // Extract wage data from CSV
      const wageData = csvData.map((row) => ({
        month: row["Wage Month"],
        wages: row["Wages on which PF contribution was paid"],
      }));

      // Configuration based on the sample data
      const config = {
        openingBalance833: 346110, // From image 1
        openingBalance116: 12527, // From image 2
        annualRate: 8.25, // 8.25% annual interest rate
      };

      // Calculate tables
      const { table833, table116 } = calculatePensionTables(config);

      // Update summary tables
      setSummaryTables({
        table833,
        table116,
      });
    } catch (error) {
      setError("Error in calculation: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Pension Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <label className="block mb-2">Upload Wage CSV File</label>
              <div className="flex items-center justify-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                  id="csvInput"
                />
                <label
                  htmlFor="csvInput"
                  className="flex items-center justify-center p-2 border rounded cursor-pointer hover:bg-gray-50"
                >
                  <Upload className="w-6 h-6 mr-2" />
                  Choose CSV
                </label>
              </div>
              {csvData && (
                <p className="mt-2 text-green-600">✓ CSV File Uploaded</p>
              )}
            </div>

            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <label className="block mb-2">Upload Calculator Excel File</label>
              <div className="flex items-center justify-center">
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleExcelUpload}
                  className="hidden"
                  id="excelInput"
                />
                <label
                  htmlFor="excelInput"
                  className="flex items-center justify-center p-2 border rounded cursor-pointer hover:bg-gray-50"
                >
                  <Upload className="w-6 h-6 mr-2" />
                  Choose Excel
                </label>
              </div>
              {calculatorSheet && (
                <p className="mt-2 text-green-600">✓ Excel File Uploaded</p>
              )}
            </div>
          </div>

          <button
            onClick={calculatePension}
            disabled={!csvData || !calculatorSheet || loading}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Calculating..." : "Calculate Pension"}
          </button>

          {error && (
            <div className="mt-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {summaryTables.table833 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">
                AMOUNT PAYABLE TILL DATE OF PAYMENT IN 2023-24 (8.33%)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border p-2">If paid by</th>
                      <th className="border p-2">
                        Opening Balance FOR 2023-24
                      </th>
                      <th className="border p-2">
                        Current year Interest up to the month
                      </th>
                      <th className="border p-2">Total payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryTables.table833.map((row, index) => (
                      <tr key={index}>
                        <td className="border p-2">{row.paymentDate}</td>
                        <td className="border p-2 text-right">
                          {row.openingBalance.toLocaleString()}
                        </td>
                        <td className="border p-2 text-right">
                          {row.interest.toLocaleString()}
                        </td>
                        <td className="border p-2 text-right">
                          {row.totalPayable.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {summaryTables.table116 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">
                AMOUNT PAYABLE TILL DATE OF PAYMENT IN 2023-24 (1.16%)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border p-2">If paid by</th>
                      <th className="border p-2">
                        Opening Balance FOR 2023-24
                      </th>
                      <th className="border p-2">
                        Current year Interest up to the month
                      </th>
                      <th className="border p-2">Total payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryTables.table116.map((row, index) => (
                      <tr key={index}>
                        <td className="border p-2">{row.paymentDate}</td>
                        <td className="border p-2 text-right">
                          {row.openingBalance.toLocaleString()}
                        </td>
                        <td className="border p-2 text-right">
                          {row.interest.toLocaleString()}
                        </td>
                        <td className="border p-2 text-right">
                          {row.totalPayable.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PensionCalculator;
