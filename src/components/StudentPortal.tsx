import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Download, FileText, BookOpen, FileCheck, GraduationCap, User, MapPin, Sparkles, Star } from 'lucide-react';
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

interface StudentPortalProps {
  onAdminClick: () => void;
}

export function StudentPortal({ onAdminClick }: StudentPortalProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [contentStructure, setContentStructure] = useState<ContentStructure | null>(null);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd1978ca/content/${selectedDepartment}/${selectedSemester}/${selectedSubject}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
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
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd1978ca/download`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ filePath }),
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

  const renderFileList = (files: FileRecord[], emptyMessage: string) => (
    <div className="space-y-3">
      {files.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </motion.div>
      ) : (
        files.map((file, index) => (
          <motion.div
            key={file.id}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-card/50 hover:border-primary/30 transition-all duration-300 hover-lift"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">{file.name}</h4>
                <p className="text-sm text-muted-foreground">
                  Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button
              onClick={() => downloadFile(file.path, file.name)}
              size="sm"
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 hover-scale transition-all duration-200"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </motion.div>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse-custom"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse-custom animate-delay-300"></div>
      </div>

      {/* Header */}
      <motion.div 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative bg-card border-b border-border shadow-2xl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-center gap-4"
            >
              <div className="relative gradient-bg-primary p-3 rounded-xl shadow-lg animate-glow">
                <GraduationCap className="h-8 w-8 text-white" />
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground gradient-text">ANH Atria Notes Hub</h1>
                <p className="text-muted-foreground">Your gateway to academic excellence</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Button 
                onClick={onAdminClick} 
                variant="outline" 
                size="sm"
                className="hover-lift border-primary/50 hover:border-primary hover:bg-primary/10 transition-all duration-300"
              >
                <User className="h-4 w-4 mr-2" />
                Admin Login
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="hover-lift bg-card/50 glass-morphism border-border/50 hover:border-primary/30 transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Department
                </CardTitle>
                <CardDescription className="text-muted-foreground">Choose your department</CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="hover-lift bg-card/50 glass-morphism border-border/50 hover:border-primary/30 transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-blue-400" />
                  Semester
                </CardTitle>
                <CardDescription className="text-muted-foreground">Select your semester</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                  <SelectTrigger className="bg-input/50 border-border hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {semesters.map((sem) => (
                      <SelectItem key={sem} value={sem.toString()} className="hover:bg-primary/10">Semester {sem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="hover-lift bg-card/50 glass-morphism border-border/50 hover:border-primary/30 transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-cyan-400" />
                  Subject
                </CardTitle>
                <CardDescription className="text-muted-foreground">Pick your subject</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="bg-input/50 border-border hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject} className="hover:bg-primary/10">{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Current Selection Display */}
        {(selectedDepartment || selectedSemester || selectedSubject) && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="mb-8 gradient-bg-secondary glass-morphism border-primary/20 shadow-xl">
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-3 items-center">
                  <span className="text-foreground font-medium flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    Current Selection:
                  </span>
                  {selectedDepartment && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 hover-scale">
                        {selectedDepartment}
                      </Badge>
                    </motion.div>
                  )}
                  {selectedSemester && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Badge variant="secondary" className="bg-blue-400/20 text-blue-400 border-blue-400/30 hover-scale">
                        Semester {selectedSemester}
                      </Badge>
                    </motion.div>
                  )}
                  {selectedSubject && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Badge variant="secondary" className="bg-cyan-400/20 text-cyan-400 border-cyan-400/30 hover-scale">
                        {selectedSubject}
                      </Badge>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Content Display */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="glass-morphism border-border/50">
              <CardContent className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto animate-glow"></div>
                <p className="mt-4 text-muted-foreground">Loading content...</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {contentStructure && selectedSubject && !loading && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Card className="shadow-2xl glass-morphism border-border/50 overflow-hidden">
              <CardHeader className="gradient-bg-primary text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-600/20 animate-pulse-custom"></div>
                <div className="relative z-10">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <BookOpen className="h-6 w-6" />
                    Study Materials for {selectedSubject}
                  </CardTitle>
                  <CardDescription className="text-blue-100">
                    {selectedDepartment} - Semester {selectedSemester}
                  </CardDescription>
                </div>
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
                    {renderFileList(contentStructure.previousYearPapers, 'No previous year papers available yet.')}
                  </TabsContent>

                  <TabsContent value="ia" className="mt-6">
                    {renderFileList(contentStructure.iaPapers, 'No IA papers available yet.')}
                  </TabsContent>

                  <TabsContent value="notes" className="mt-6">
                    <div className="space-y-6">
                      {Object.keys(contentStructure.notes).length === 0 ? (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-8"
                        >
                          <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                          <p className="text-muted-foreground">No notes available yet.</p>
                        </motion.div>
                      ) : (
                        Object.entries(contentStructure.notes).map(([module, files]) => (
                          <div key={module}>
                            <h3 className="font-medium mb-3 text-foreground capitalize border-b border-border pb-2">
                              {module.replace('module', 'Module ')}
                            </h3>
                            {renderFileList(files, `No notes available for ${module.replace('module', 'Module ')} yet.`)}
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Welcome Message */}
        {!selectedDepartment && !selectedSemester && !selectedSubject && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Card className="text-center gradient-bg-secondary glass-morphism border-primary/20 shadow-2xl">
              <CardContent className="py-12">
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="relative inline-block mb-6"
                >
                  <GraduationCap className="h-16 w-16 text-primary mx-auto animate-glow" />
                  <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-pulse-custom" />
                </motion.div>
                <motion.h2 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-2xl font-bold text-foreground mb-4 gradient-text"
                >
                  Welcome to ANH Atria Notes Hub
                </motion.h2>
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-muted-foreground max-w-2xl mx-auto leading-relaxed"
                >
                  Your comprehensive platform for accessing academic resources. Select your department, semester, 
                  and subject to explore previous year question papers, internal assessment papers, and detailed 
                  notes organized by modules.
                </motion.p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Developer Section */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Card className="mt-12 glass-morphism border-border/50 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <User className="h-5 w-5 text-primary" />
                About the Developer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-start gap-6">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="gradient-bg-primary p-6 rounded-xl text-white relative overflow-hidden hover-lift"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                  <div className="relative z-10">
                    <User className="h-12 w-12 mb-4" />
                    <h3 className="font-bold text-xl">Dhanush</h3>
                    <p className="text-blue-100">Full Stack Developer</p>
                  </div>
                </motion.div>
                
                <div className="flex-1 space-y-4">
                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <h4 className="font-semibold text-foreground mb-2">Educational Background</h4>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <span>Computer Science & Engineering (Data Science)</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>Atria Institute of Technology</span>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    <h4 className="font-semibold text-foreground mb-2">About This Project</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      ANH Atria Notes Hub was developed to streamline access to academic resources for students. 
                      This platform provides a centralized location for downloading previous year question papers, 
                      internal assessment papers, and comprehensive notes organized by subjects and modules. 
                      Built with modern web technologies and designed with student convenience in mind.
                    </p>
                  </motion.div>
                  
                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.9 }}
                  >
                    <h4 className="font-semibold text-foreground mb-2">Technical Stack</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="hover-scale border-primary/30 hover:border-primary">React</Badge>
                      <Badge variant="outline" className="hover-scale border-primary/30 hover:border-primary">TypeScript</Badge>
                      <Badge variant="outline" className="hover-scale border-primary/30 hover:border-primary">Tailwind CSS</Badge>
                      <Badge variant="outline" className="hover-scale border-primary/30 hover:border-primary">Supabase</Badge>
                      <Badge variant="outline" className="hover-scale border-primary/30 hover:border-primary">Motion</Badge>
                      <Badge variant="outline" className="hover-scale border-primary/30 hover:border-primary">Responsive Design</Badge>
                    </div>
                  </motion.div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}