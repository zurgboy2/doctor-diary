import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Paper, 
  Switch, 
  FormControlLabel,
  Box,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tabs,
  Tab,
  IconButton,
  MenuItem
} from '@mui/material';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { deleteAccount } from '../utils/auth';
import { dbGetAll, dbPut, dbDelete } from '../utils/database';
import { encryptData, decryptData } from '../utils/encryption';
import { useTranslation } from 'react-i18next';
import LanguageIcon from '@mui/icons-material/Language';


function MainScreen({ username, currentKey, handleThemeChange, mode }) {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [capturedImage, setCapturedImage] = useState(null);
  const [reminderDate, setReminderDate] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentName, setDocumentName] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [documentDateFilter, setDocumentDateFilter] = useState(null);
  const [documentFilterType, setDocumentFilterType] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editingEntry, setEditingEntry] = useState(false);
  const { t, i18n } = useTranslation();

  const loadEntries = useCallback(async () => {
    try {
      const encryptedEntries = await dbGetAll('entries');
      const decryptedEntries = await Promise.all(
        encryptedEntries.map(async (entry) => ({
          id: entry.id,
          content: await decryptData(currentKey, entry.content.encryptedData, entry.content.iv),
          timestamp: entry.timestamp
        }))
      );
      setEntries(decryptedEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  }, [currentKey]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'de' : 'en';
    i18n.changeLanguage(newLang);
  };
  
  const loadDocuments = useCallback(async () => {
    try {
      const encryptedDocuments = await dbGetAll('documents');
      const decryptedDocuments = await Promise.all(
        encryptedDocuments.map(async (doc) => ({
          id: doc.id,
          name: doc.name,
          image: await decryptData(currentKey, doc.image.encryptedData, doc.image.iv),
          reminderDate: doc.reminderDate
        }))
      );
      setDocuments(decryptedDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }, [currentKey]);

  useEffect(() => {
    loadEntries();
    loadDocuments();
  }, [currentKey, loadEntries, loadDocuments]);


  const getFilteredEntries = useCallback(() => {
    if (!dateFilter || filterType === 'all') return entries;
    
    const filterDate = new Date(dateFilter);
    return entries.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      switch (filterType) {
        case 'day':
          return entryDate.toDateString() === filterDate.toDateString();
        case 'week':
          const weekStart = new Date(filterDate);
          weekStart.setDate(filterDate.getDate() - filterDate.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return entryDate >= weekStart && entryDate <= weekEnd;
        case 'month':
          return entryDate.getMonth() === filterDate.getMonth() && 
                 entryDate.getFullYear() === filterDate.getFullYear();
        default:
          return true;
      }
    });
  }, [entries, dateFilter, filterType]);
  
  // Add this UI component above the entries list
  const DateFilterSection = () => (
    <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
      <DatePicker
        selected={dateFilter}
        onChange={(date) => setDateFilter(date)}
        customInput={<TextField label={t('filterByDate')}  />}
        isClearable
      />
      <TextField
        select
        label={t('filterType')} 
        value={filterType}
        onChange={(e) => setFilterType(e.target.value)}
        sx={{ minWidth: 120 }}
      >
        <MenuItem value="all">{t('all')} </MenuItem>
        <MenuItem value="day">{t('day')} </MenuItem>
        <MenuItem value="week">{t('week')} </MenuItem>
        <MenuItem value="month">{t('month')} </MenuItem>
      </TextField>
    </Box>
  );

  const updateEntry = async () => {
    if (!selectedEntry) return;
    try {
      const encryptedContent = await encryptData(currentKey, selectedEntry.content);
      const updatedEntry = {
        id: selectedEntry.id,
        content: encryptedContent,
        timestamp: selectedEntry.timestamp
      };
      await dbPut('entries', updatedEntry);
      setSelectedEntry(null);
      setEditingEntry(false);
      loadEntries();
    } catch (error) {
      console.error('Error updating entry:', error);
    }
  };
  
  // Add this function to delete entries
  const deleteEntry = async (id) => {
    try {
      await dbDelete('entries', id);
      loadEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const getFilteredDocuments = useCallback(() => {
    if (!documentDateFilter || documentFilterType === 'all') return documents;
    
    const filterDate = new Date(documentDateFilter);
    return documents.filter(doc => {
      const docDate = new Date(doc.reminderDate);
      switch (documentFilterType) {
        case 'day':
          return docDate.toDateString() === filterDate.toDateString();
        case 'week':
          const weekStart = new Date(filterDate);
          weekStart.setDate(filterDate.getDate() - filterDate.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return docDate >= weekStart && docDate <= weekEnd;
        case 'month':
          return docDate.getMonth() === filterDate.getMonth() && 
                 docDate.getFullYear() === filterDate.getFullYear();
        default:
          return true;
      }
    });
  }, [documents, documentDateFilter, documentFilterType]);

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount(username);
      // Redirect to login/clear authentication
      window.location.reload();
    } catch (error) {
      console.error('Error deleting account:', error);
      // You might want to show an error message to the user here
    }
  };

  const addEntry = async () => {
    if (!newEntry.trim()) return;
    try {
      const encryptedContent = await encryptData(currentKey, newEntry);
      const entry = {
        content: encryptedContent,
        timestamp: new Date().toISOString()
      };
      await dbPut('entries', entry);
      setNewEntry('');
      setOpenDialog(false);
      loadEntries();
    } catch (error) {
      console.error('Error adding entry:', error);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL('image/jpeg'));
    video.srcObject.getTracks().forEach(track => track.stop());
  };

  const saveDocument = async () => {
    if (!capturedImage || !reminderDate || !documentName) return;
    try {
      const encryptedImage = await encryptData(currentKey, capturedImage);
      const document = {
        name: documentName,
        image: encryptedImage,
        reminderDate: reminderDate.toISOString()
      };
      await dbPut('documents', document);
      setCapturedImage(null);
      setReminderDate(null);
      setDocumentName('');
      loadDocuments();
    } catch (error) {
      console.error('Error saving document:', error);
    }
  };

  const openDocument = (doc) => {
    setSelectedDocument(doc);
    setEditMode(false);
  };

  const closeDocument = () => {
    setSelectedDocument(null);
    setEditMode(false);
  };

  const updateDocument = async () => {
    if (!selectedDocument) return;
    try {
      const encryptedImage = await encryptData(currentKey, selectedDocument.image);
      const updatedDoc = {
        id: selectedDocument.id,
        name: selectedDocument.name,
        image: encryptedImage,
        reminderDate: selectedDocument.reminderDate
      };
      await dbPut('documents', updatedDoc);
      closeDocument();
      loadDocuments();
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };

  const deleteDocument = async (id) => {
    try {
      await dbDelete('documents', id);
      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  return (
    <>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('appName')}
          </Typography>
          <IconButton 
            color="inherit" 
            onClick={toggleLanguage}
            sx={{ mr: 2 }}
          >
            <LanguageIcon />
            <Typography variant="body2" sx={{ ml: 1 }}>
              {i18n.language === 'en' ? 'DE' : 'EN'}
            </Typography>
          </IconButton>
          <Button 
            color="inherit" 
            onClick={() => setDeleteDialogOpen(true)}
            sx={{ mr: 2 }}
          >
            {t('deleteAccount')}
          </Button>
          <FormControlLabel
            control={
              <Switch
                checked={mode === 'dark'}
                onChange={handleThemeChange}
                icon={<Brightness7Icon />}
                checkedIcon={<Brightness4Icon />}
              />
            }
            label={t(mode === 'dark' ? 'darkMode' : 'lightMode')}
          />
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Paper elevation={3} sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h4" component="h1" gutterBottom>
          {t('welcome')} {username}
          </Typography>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
            <Tab label={t('diaryEntries')} />
            <Tab label={t('documentProcessing')} />
          </Tabs>
          {activeTab === 0 && (
            <>
              <Button variant="contained" onClick={() => setOpenDialog(true)} sx={{ mb: 2 }}>
              {t('addNewEntry')}
              </Button>
              <DateFilterSection />
              <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                {getFilteredEntries().map((entry) => (
                  <ListItem 
                    key={entry.id}
                    secondaryAction={
                      <>
                        <IconButton onClick={() => {
                          setSelectedEntry(entry);
                          setEditingEntry(true);
                        }}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => deleteEntry(entry.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </>
                    }
                  >
                    <ListItemText 
                      primary={entry.content} 
                      secondary={new Date(entry.timestamp).toLocaleString()} 
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
          {activeTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {!capturedImage ? (
                <>
                  <video ref={videoRef} style={{ width: '100%', maxWidth: '500px' }} autoPlay />
                  <Button variant="contained" onClick={startCamera} sx={{ mt: 2 }}>
                  {t('startCamera')} 
                  </Button>
                  <IconButton onClick={captureImage} sx={{ mt: 2 }}>
                    <CameraAltIcon />
                  </IconButton>
                </>
              ) : (
                <>
                  <img src={capturedImage} alt="Captured" style={{ width: '100%', maxWidth: '500px' }} />
                  <TextField
                    label="Document Name"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    sx={{ mt: 2 }}
                  />
                  <DatePicker
                    selected={reminderDate}
                    onChange={(date) => setReminderDate(date)}
                    customInput={<TextField label="Reminder Date" sx={{ mt: 2 }} />}
                  />
                  <Button variant="contained" onClick={saveDocument} sx={{ mt: 2 }}>
                  {t('saveDocument')} 
                  </Button>
                </>
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {/* Add Document Filter Section */}
              <Box sx={{ width: '100%', mt: 3, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <DatePicker
                  selected={documentDateFilter}
                  onChange={(date) => setDocumentDateFilter(date)}
                  customInput={<TextField label={t('filterByDate')}/>}
                  isClearable
                />
                <TextField
                  select
                  label="Filter type"
                  value={documentFilterType}
                  onChange={(e) => setDocumentFilterType(e.target.value)}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="all">{t('all')} </MenuItem>
                  <MenuItem value="day">{t('day')} </MenuItem>
                  <MenuItem value="week">{t('week')} </MenuItem>
                  <MenuItem value="month">{t('month')} </MenuItem>
                </TextField>
              </Box>
              
              <List sx={{ width: '100%', mt: 2 }}>
                {getFilteredDocuments().map((doc) => (
                  <ListItem key={doc.id}>
                    <ListItemText
                      primary={doc.name}
                      secondary={`Reminder: ${new Date(doc.reminderDate).toLocaleString()}`}
                      onClick={() => openDocument(doc)}
                    />
                    <IconButton onClick={() => deleteDocument(doc.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Paper>
      </Container>
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>{t('addNewEntry')} </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="entry"
            label="Entry"
            type="text"
            fullWidth
            variant="standard"
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>{t('cancel')} </Button>
          <Button onClick={addEntry}>{t('add')} </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!selectedDocument} onClose={closeDocument} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit Document' : 'View Document'}
          <IconButton
            aria-label="edit"
            onClick={() => setEditMode(!editMode)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <EditIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <>
              <TextField
                label="Document Name"
                value={selectedDocument.name}
                onChange={(e) => setSelectedDocument({...selectedDocument, name: e.target.value})}
                disabled={!editMode}
                fullWidth
                sx={{ mb: 2 }}
              />
              <img src={selectedDocument.image} alt="Document" style={{ width: '100%', maxHeight: '500px', objectFit: 'contain' }} />
              <DatePicker
                selected={new Date(selectedDocument.reminderDate)}
                onChange={(date) => setSelectedDocument({...selectedDocument, reminderDate: date.toISOString()})}
                customInput={<TextField label="Reminder Date" fullWidth sx={{ mt: 2 }} />}
                disabled={!editMode}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDocument}>{t('close')} </Button>
          {editMode && <Button onClick={updateDocument}>{t('save')} </Button>}
        </DialogActions>
      </Dialog>
      <Dialog open={editingEntry} onClose={() => {
        setSelectedEntry(null);
        setEditingEntry(false);
      }}>
        <DialogTitle>{t('edit')} </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Entry"
            type="text"
            fullWidth
            variant="standard"
            value={selectedEntry?.content || ''}
            onChange={(e) => setSelectedEntry({
              ...selectedEntry,
              content: e.target.value
            })}
            sx={{ mb: 2 }}
          />
          <DatePicker
            selected={selectedEntry ? new Date(selectedEntry.timestamp) : null}
            onChange={(date) => setSelectedEntry({
              ...selectedEntry,
              timestamp: date.toISOString()
            })}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="MMMM d, yyyy h:mm aa"
            customInput={<TextField label="Date and Time" fullWidth />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSelectedEntry(null);
            setEditingEntry(false);
          }}>{t('cancel')} </Button>
          <Button onClick={updateEntry}>{t('save')} </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>{t('deleteAccount')} </DialogTitle>
        <DialogContent>
          <DialogContentText>
          {t('deleteAccountConfirmMessage')}             
            </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('cancel')} </Button>
          <Button 
            onClick={handleDeleteAccount} 
            color="error" 
            variant="contained"
          >
            {t('deleteAccount')} 
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default MainScreen;