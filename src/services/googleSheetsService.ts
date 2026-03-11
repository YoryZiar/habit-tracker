export interface HabitRecord {
  id: string;
  name: string;
  type: 'boolean' | 'quantitative';
  target: number;
  unit?: string;
  records: Record<string, string | number>;
  createdAt: string;
}

const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SHEET_NAME = 'Sheet1'; // Default sheet name

export const googleSheetsService = {
  // Autentikasi API
  authenticate: async (token: string): Promise<boolean> => {
    localStorage.setItem('gapi_access_token', token);
    
    // Test connection and initialize headers if empty
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:G1?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
      throw new Error('Token tidak valid atau tidak memiliki akses ke Spreadsheet');
    }

    const data = await res.json();
    if (!data.values || data.values.length === 0) {
      // Write headers
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:G1?valueInputOption=RAW&key=${API_KEY}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [['id', 'name', 'type', 'target', 'unit', 'records', 'createdAt']]
        })
      });
    }
    
    return true;
  },

  // Fetch Data (GET)
  getHabits: async (): Promise<HabitRecord[]> => {
    const token = localStorage.getItem('gapi_access_token');
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:G?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Gagal mengambil data dari Google Sheets');
    
    const data = await res.json();
    if (!data.values || data.values.length <= 1) return []; // Empty or only headers
    
    return data.values.slice(1).map((row: any[]) => ({
      id: row[0],
      name: row[1],
      type: row[2] as 'boolean' | 'quantitative',
      target: Number(row[3]),
      unit: row[4] || '',
      records: row[5] ? JSON.parse(row[5]) : {},
      createdAt: row[6]
    }));
  },

  // Update Data (PUT)
  updateHabit: async (habit: HabitRecord): Promise<boolean> => {
    const token = localStorage.getItem('gapi_access_token');
    
    // Find row index
    const resGet = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:A?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataGet = await resGet.json();
    if (!dataGet.values) return false;
    
    const rowIndex = dataGet.values.findIndex((row: any[]) => row[0] === habit.id);
    if (rowIndex === -1) return false;
    
    const actualRowNumber = rowIndex + 1;
    
    const row = [
      habit.id,
      habit.name,
      habit.type,
      habit.target,
      habit.unit || '',
      JSON.stringify(habit.records),
      habit.createdAt
    ];
    
    const resPut = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A${actualRowNumber}:G${actualRowNumber}?valueInputOption=RAW&key=${API_KEY}`, {
      method: 'PUT',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [row] })
    });
    
    return resPut.ok;
  },
  
  // Tambah Habit Baru (POST)
  addHabit: async (habit: HabitRecord): Promise<boolean> => {
    const token = localStorage.getItem('gapi_access_token');
    const row = [
      habit.id,
      habit.name,
      habit.type,
      habit.target,
      habit.unit || '',
      JSON.stringify(habit.records),
      habit.createdAt
    ];
    
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:G:append?valueInputOption=RAW&key=${API_KEY}`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [row] })
    });
    
    return res.ok;
  },
  
  // Hapus Habit (DELETE via batchUpdate)
  deleteHabit: async (id: string): Promise<boolean> => {
    const token = localStorage.getItem('gapi_access_token');
    
    const resGet = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:A?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataGet = await resGet.json();
    if (!dataGet.values) return false;
    
    const rowIndex = dataGet.values.findIndex((row: any[]) => row[0] === id);
    if (rowIndex === -1) return false;
    
    const resDelete = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate?key=${API_KEY}`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0, // gid=0
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }
        ]
      })
    });
    
    return resDelete.ok;
  }
};
