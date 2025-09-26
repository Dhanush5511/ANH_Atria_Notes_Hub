import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Upload, FileText, Trash2, LogOut, Plus, Download, Shield, Settings, Database } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface FileRecord {
  id: string;
  name: string;
  path: string;
  uploadedAt: string;
}

interface ContentStructure {
  previousYearPapers: FileRecord[];
  iaPapers: FileRecord[];
  notes: {
    [module: string]: FileRecord[];
  };
}

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

export function AdminDashboard({ token, onLogout }: AdminDashboardProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedContentType, setSelectedContentType] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [contentStructure, setContentStructure] = useState<ContentStructure | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string>('');

  // Static data
  const departments = ['CSE', 'AI&ML', 'ISE', 'CIVIL', 'MECH', 'ECE'];
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  // Get subjects based on department
  const getSubjects = (department: string) => {
    const subjectMap: Record<string, string[]> = {
      'CSE': ['Mathematics', 'Data Structures', 'Computer Networks', 'Operating Systems', 'Software Engineering'],
      'AI&ML': ['Mathematics', 'Machine Learning', 'Data Science', 'Artificial Intelligence', 'Statistics'],
      'ISE': ['Mathematics', 'Information Systems', 'Database Management', 'Systems Analysis', 'Project Management'],
      'ECE': ['Mathematics', 'Circuit Analysis', 'Digital Electronics', 'Communication Systems', 'Control Systems'],
      'MECH': ['Mathematics', 'Thermodynamics', 'Fluid Mechanics', 'Machine Design', 'Manufacturing Processes'],
      'CIVIL': ['Mathematics', 'Structural Analysis', 'Concrete Technology', 'Surveying', 'Construction Management']
    };
    return subjectMap[department] || [];
  };

  const subjects = selectedDepartment ? getSubjects(selectedDepartment) : [];

  // Fetch content when subject is selected
  useEffect(() => {
    if (selectedDepartment && selectedSemester && selectedSubject) {
      fetchContent();
    } else {
      setContentStructure(null);
    }
  }, [selectedDepartment, selectedSemester, selectedSubject]);

  const fetchContent = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd1978ca/content/${selectedDepartment}/${selectedSemester}/${selectedSubject}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setContentStructure(data);
      } else {
        console.error('Failed to fetch content:', response.statusText);
        setContentStructure({
          previousYearPapers: [],
          iaPapers: [],
          notes: {}
        });
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      setContentStructure({
        previousYearPapers: [],
        iaPapers: [],
        notes: {}
      });
    }
  };

  const addNewSubject = async () => {
    if (!newSubjectName.trim() || !selectedDepartment || !selectedSemester) {
      setMessage('Please select department and semester before adding a subject.');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd1978ca/subjects`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            department: selectedDepartment,
            semester: selectedSemester,
            subject: newSubjectName.trim()
          }),
        }
      );

      if (response.ok) {
        setMessage('Subject added successfully!');
        setNewSubjectName('');
        // You might want to refresh the subjects list here
      } else {
        const errorData = await response.json();
        setMessage(`Failed to add subject: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      setMessage(`Error adding subject: ${error}`);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedDepartment || !selectedSemester || !selectedSubject || !selectedContentType) {
      setMessage('Please select department, semester, subject, and content type before uploading.');
      return;
    }

    if (selectedContentType === 'notes' && !selectedModule) {
      setMessage('Please select a module for notes upload.');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('department', selectedDepartment);
      formData.append('semester', selectedSemester);
      formData.append('subject', selectedSubject);
      formData.append('contentType', selectedContentType);
      if (selectedContentType === 'notes') {
        formData.append('module', selectedModule);
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd1978ca/admin/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        setMessage('File uploaded successfully!');
        fetchContent(); // Refresh content
        event.target.value = ''; // Clear file input
      } else {
        const errorData = await response.json();
        setMessage(`Upload failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      setMessage(`Upload error: ${error}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd1978ca/admin/delete/${selectedDepartment}/${selectedSemester}/${selectedSubject}/${fileId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setMessage('File deleted successfully!');
        fetchContent(); // Refresh content
      } else {
        const errorData = await response.json();
        setMessage(`Delete failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      setMessage(`Delete error: ${error}`);
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd1978ca/download/${encodeURIComponent(filePath)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const link = document.createElement('a');
        link.href = data.url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.error('Download failed:', response.statusText);
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const renderFileList = (files: FileRecord[], canDelete = true) => (
    <div className="space-y-2">
      {files.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-muted-foreground text-sm text-center py-4"
        >
          No files uploaded yet
        </motion.div>
      ) : (
        files.map((file, index) => (
          <motion.div
            key={file.id}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/30 hover:bg-card/50 hover:border-primary/30 transition-all duration-300 hover-lift"
          >
            <div className="flex items-center gap-2">
              <div className="p-1 bg-primary/10 rounded">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{file.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile(file.path, file.name)}
                className="hover-scale border-primary/30 hover:border-primary hover:bg-primary/10"
              >
                <Download className="h-4 w-4" />
              </Button>
              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteFile(file.id)}
                  className="hover-scale border-destructive/30 hover:border-destructive hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse-custom"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse-custom animate-delay-300"></div>
      </div>

      <motion.div 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative bg-card border-b border-border shadow-2xl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-center gap-3"
            >
              <div className="gradient-bg-primary p-3 rounded-xl shadow-lg animate-glow">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground gradient-text">Admin Dashboard</h1>
                <p className="text-muted-foreground">ANH Atria Notes Hub Management</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Button 
                onClick={onLogout} 
                variant="outline"
                className="hover-lift border-destructive/50 hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className={
              message.includes('success') 
                ? 'border-green-500/20 bg-green-500/10 text-green-400' 
                : 'border-destructive/20 bg-destructive/10 text-destructive'
            }>
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          {/* Selection Panel */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="glass-morphism border-border/50 hover:border-primary/30 transition-all duration-300 hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Settings className="h-5 w-5 text-primary" />
                  Content Selection
                </CardTitle>
                <CardDescription className="text-muted-foreground">Select department, semester, and subject</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-foreground">Department</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="bg-input/50 border-border hover:border-primary/50 transition-colors">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept} className="hover:bg-primary/10">{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-foreground">Semester</Label>
                  <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                    <SelectTrigger className="bg-input/50 border-border hover:border-primary/50 transition-colors">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {semesters.map((sem) => (
                        <SelectItem key={sem} value={sem.toString()} className="hover:bg-primary/10">{sem}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-foreground">Subject</Label>
                  <div className="space-y-2">
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger className="bg-input/50 border-border hover:border-primary/50 transition-colors">
                        <SelectValue placeholder="Select or add subject" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {subjects.map((subject) => (
                          <SelectItem key={subject} value={subject} className="hover:bg-primary/10">{subject}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input
                        placeholder="New subject name"
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        className="bg-input/50 border-border hover:border-primary/50 focus:border-primary transition-colors"
                      />
                      <Button 
                        onClick={addNewSubject} 
                        size="sm"
                        className="bg-primary hover:bg-primary/90 hover-scale"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Upload Panel */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="glass-morphism border-border/50 hover:border-primary/30 transition-all duration-300 hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Content
                </CardTitle>
                <CardDescription className="text-muted-foreground">Upload files for the selected subject</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-foreground">Content Type</Label>
                  <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                    <SelectTrigger className="bg-input/50 border-border hover:border-primary/50 transition-colors">
                      <SelectValue placeholder="Select content type" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="previousYearPaper" className="hover:bg-primary/10">Previous Year Paper</SelectItem>
                      <SelectItem value="iaPaper" className="hover:bg-primary/10">IA Paper</SelectItem>
                      <SelectItem value="notes" className="hover:bg-primary/10">Notes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedContentType === 'notes' && (
                  <div>
                    <Label className="text-foreground">Module</Label>
                    <Select value={selectedModule} onValueChange={setSelectedModule}>
                      <SelectTrigger className="bg-input/50 border-border hover:border-primary/50 transition-colors">
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="1" className="hover:bg-primary/10">Module 1</SelectItem>
                        <SelectItem value="2" className="hover:bg-primary/10">Module 2</SelectItem>
                        <SelectItem value="3" className="hover:bg-primary/10">Module 3</SelectItem>
                        <SelectItem value="4" className="hover:bg-primary/10">Module 4</SelectItem>
                        <SelectItem value="5" className="hover:bg-primary/10">Module 5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-foreground">File</Label>
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading || !selectedDepartment || !selectedSemester || !selectedSubject || !selectedContentType}
                    accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                    className="bg-input/50 border-border hover:border-primary/50 focus:border-primary transition-colors"
                  />
                  {uploading && (
                    <div className="text-sm text-primary mt-2 flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Uploading...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Status Panel */}
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="glass-morphism border-border/50 hover:border-primary/30 transition-all duration-300 hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Database className="h-5 w-5 text-primary" />
                  Current Selection
                </CardTitle>
                <CardDescription className="text-muted-foreground">Selected content details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Department:</span>
                    <Badge variant="outline" className="border-primary/30 hover:border-primary hover-scale">
                      {selectedDepartment || 'None'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Semester:</span>
                    <Badge variant="outline" className="border-primary/30 hover:border-primary hover-scale">
                      {selectedSemester || 'None'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Subject:</span>
                    <Badge variant="outline" className="border-primary/30 hover:border-primary hover-scale">
                      {selectedSubject || 'None'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Content Management */}
        {contentStructure && selectedSubject && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Card className="mt-8 glass-morphism border-border/50 shadow-2xl">
              <CardHeader className="gradient-bg-secondary border-b border-border/50">
                <CardTitle className="text-foreground">Manage Content for {selectedSubject}</CardTitle>
                <CardDescription className="text-muted-foreground">{selectedDepartment} - Semester {selectedSemester}</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="previous-year" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-card/50 border border-border">
                    <TabsTrigger value="previous-year" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      Previous Year Papers
                    </TabsTrigger>
                    <TabsTrigger value="ia" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      IA Papers
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      Notes
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="previous-year" className="mt-6">
                    {renderFileList(contentStructure.previousYearPapers)}
                  </TabsContent>

                  <TabsContent value="ia" className="mt-6">
                    {renderFileList(contentStructure.iaPapers)}
                  </TabsContent>

                  <TabsContent value="notes" className="mt-6">
                    <div className="space-y-6">
                      {Object.entries(contentStructure.notes).map(([module, files]) => (
                        <div key={module}>
                          <h4 className="font-medium mb-3 text-foreground capitalize border-b border-border pb-2">
                            {module.replace('module', 'Module ')}
                          </h4>
                          {renderFileList(files)}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}