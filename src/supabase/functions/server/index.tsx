import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize Supabase client for server operations (using service role key)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Create storage buckets on startup
async function initializeStorage() {
  const bucketName = 'make-fd1978ca-documents';
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false });
      console.log(`Created storage bucket: ${bucketName}`);
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
}

// Initialize storage on startup
initializeStorage();

// Health check endpoint
app.get("/make-server-fd1978ca/health", (c) => {
  return c.json({ status: "ok" });
});

// Admin signup route (creates the admin user)
app.post("/make-server-fd1978ca/admin/signup", async (c) => {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'dhanush@atrianotes.com',
      password: '2005Dhanush@',
      user_metadata: { name: 'Dhanush', role: 'admin' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      // If user already exists, that's okay - just return success
      if (error.message?.includes('email_exists') || error.message?.includes('already been registered')) {
        return c.json({ message: 'Admin user already exists', existing: true });
      }
      console.error('Admin signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Admin user created successfully', data });
  } catch (error) {
    console.error('Admin signup server error:', error);
    return c.json({ error: 'Internal server error during admin signup' }, 500);
  }
});

// Get content structure (departments, semesters, subjects)
app.get("/make-server-fd1978ca/content/structure", async (c) => {
  try {
    const structure = await kv.get('content_structure');
    if (!structure) {
      // Initialize default structure
      const defaultStructure = {
        departments: ['CSE', 'AI&ML', 'ISE', 'CIVIL', 'MECH', 'ECE'],
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
        subjects: {} // Will be populated as admin adds subjects
      };
      await kv.set('content_structure', defaultStructure);
      return c.json(defaultStructure);
    }
    return c.json(structure);
  } catch (error) {
    console.error('Error fetching content structure:', error);
    return c.json({ error: 'Failed to fetch content structure' }, 500);
  }
});

// Get subjects for a specific department and semester
app.get("/make-server-fd1978ca/content/subjects/:department/:semester", async (c) => {
  try {
    const department = c.req.param('department');
    const semester = c.req.param('semester');
    const key = `subjects_${department}_${semester}`;
    
    const subjects = await kv.get(key) || [];
    return c.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return c.json({ error: 'Failed to fetch subjects' }, 500);
  }
});

// Get content for a specific subject
app.get("/make-server-fd1978ca/content/:department/:semester/:subject", async (c) => {
  try {
    const department = c.req.param('department');
    const semester = c.req.param('semester');
    const subject = c.req.param('subject');
    const key = `content_${department}_${semester}_${subject}`;
    
    const content = await kv.get(key) || {
      previousYearPapers: [],
      iaPapers: [],
      notes: { module1: [], module2: [], module3: [], module4: [], module5: [] }
    };
    
    return c.json(content);
  } catch (error) {
    console.error('Error fetching content:', error);
    return c.json({ error: 'Failed to fetch content' }, 500);
  }
});

// Protected route middleware
async function requireAuth(c: any, next: any) {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return c.json({ error: 'No authorization token provided' }, 401);
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    console.error('Authorization error while verifying admin access:', error);
    return c.json({ error: 'Unauthorized access attempt' }, 401);
  }

  c.set('user', user);
  await next();
}

// Add new subject route
app.post("/make-server-fd1978ca/subjects", requireAuth, async (c) => {
  try {
    const { department, semester, subject } = await c.req.json();
    
    if (!department || !semester || !subject) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const subjectsKey = `subjects_${department}_${semester}`;
    const existingSubjects = await kv.get(subjectsKey) || [];
    
    if (!existingSubjects.includes(subject)) {
      existingSubjects.push(subject);
      await kv.set(subjectsKey, existingSubjects);
    }

    return c.json({ message: 'Subject added successfully' });
  } catch (error) {
    console.error('Add subject server error:', error);
    return c.json({ error: 'Internal server error during subject addition' }, 500);
  }
});

// Upload file (compatibility route)
app.post("/make-server-fd1978ca/upload", requireAuth, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const department = formData.get('department') as string;
    const semester = formData.get('semester') as string;
    const subject = formData.get('subject') as string;
    const contentType = formData.get('contentType') as string; // 'previousYearPaper', 'iaPaper', 'notes'
    const module = formData.get('module') as string; // for notes only

    if (!file || !department || !semester || !subject || !contentType) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Create file path
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${department}/${semester}/${subject}/${contentType}/${module ? `module${module}/` : ''}${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('make-fd1978ca-documents')
      .upload(filePath, file);

    if (error) {
      console.error('File upload error:', error);
      return c.json({ error: 'Failed to upload file' }, 500);
    }

    // Add to subject if it doesn't exist
    const subjectsKey = `subjects_${department}_${semester}`;
    const existingSubjects = await kv.get(subjectsKey) || [];
    if (!existingSubjects.includes(subject)) {
      existingSubjects.push(subject);
      await kv.set(subjectsKey, existingSubjects);
    }

    // Update content structure
    const contentKey = `content_${department}_${semester}_${subject}`;
    const existingContent = await kv.get(contentKey) || {
      previousYearPapers: [],
      iaPapers: [],
      notes: { module1: [], module2: [], module3: [], module4: [], module5: [] }
    };

    const fileRecord = {
      id: Date.now().toString(),
      name: file.name,
      path: filePath,
      uploadedAt: new Date().toISOString()
    };

    if (contentType === 'previousYearPaper') {
      existingContent.previousYearPapers.push(fileRecord);
    } else if (contentType === 'iaPaper') {
      existingContent.iaPapers.push(fileRecord);
    } else if (contentType === 'notes' && module) {
      existingContent.notes[`module${module}`].push(fileRecord);
    }

    await kv.set(contentKey, existingContent);

    return c.json({ message: 'File uploaded successfully', fileRecord });
  } catch (error) {
    console.error('Upload server error:', error);
    return c.json({ error: 'Internal server error during file upload' }, 500);
  }
});

// Admin upload file
app.post("/make-server-fd1978ca/admin/upload", requireAuth, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const department = formData.get('department') as string;
    const semester = formData.get('semester') as string;
    const subject = formData.get('subject') as string;
    const contentType = formData.get('contentType') as string; // 'previousYearPaper', 'iaPaper', 'notes'
    const module = formData.get('module') as string; // for notes only

    if (!file || !department || !semester || !subject || !contentType) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Create file path
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${department}/${semester}/${subject}/${contentType}/${module ? `module${module}/` : ''}${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('make-fd1978ca-documents')
      .upload(filePath, file);

    if (error) {
      console.error('File upload error:', error);
      return c.json({ error: 'Failed to upload file' }, 500);
    }

    // Add to subject if it doesn't exist
    const subjectsKey = `subjects_${department}_${semester}`;
    const existingSubjects = await kv.get(subjectsKey) || [];
    if (!existingSubjects.includes(subject)) {
      existingSubjects.push(subject);
      await kv.set(subjectsKey, existingSubjects);
    }

    // Update content structure
    const contentKey = `content_${department}_${semester}_${subject}`;
    const existingContent = await kv.get(contentKey) || {
      previousYearPapers: [],
      iaPapers: [],
      notes: { module1: [], module2: [], module3: [], module4: [], module5: [] }
    };

    const fileRecord = {
      id: Date.now().toString(),
      name: file.name,
      path: filePath,
      uploadedAt: new Date().toISOString()
    };

    if (contentType === 'previousYearPaper') {
      existingContent.previousYearPapers.push(fileRecord);
    } else if (contentType === 'iaPaper') {
      existingContent.iaPapers.push(fileRecord);
    } else if (contentType === 'notes' && module) {
      existingContent.notes[`module${module}`].push(fileRecord);
    }

    await kv.set(contentKey, existingContent);

    return c.json({ message: 'File uploaded successfully', fileRecord });
  } catch (error) {
    console.error('Upload server error:', error);
    return c.json({ error: 'Internal server error during file upload' }, 500);
  }
});

// Get download URL for a file (POST method for backward compatibility)
app.post("/make-server-fd1978ca/download", async (c) => {
  try {
    const { filePath } = await c.req.json();
    
    const { data, error } = await supabase.storage
      .from('make-fd1978ca-documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      return c.json({ error: 'Failed to create download URL' }, 500);
    }

    return c.json({ url: data.signedUrl });
  } catch (error) {
    console.error('Download URL server error:', error);
    return c.json({ error: 'Internal server error during download URL creation' }, 500);
  }
});

// Get download URL for a file
app.get("/make-server-fd1978ca/download/:filePath", async (c) => {
  try {
    const filePath = decodeURIComponent(c.req.param('filePath'));
    
    const { data, error } = await supabase.storage
      .from('make-fd1978ca-documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      return c.json({ error: 'Failed to create download URL' }, 500);
    }

    return c.json({ url: data.signedUrl });
  } catch (error) {
    console.error('Download URL server error:', error);
    return c.json({ error: 'Internal server error during download URL creation' }, 500);
  }
});

// Delete file (compatibility route)
app.delete("/make-server-fd1978ca/delete/:fileId", requireAuth, async (c) => {
  try {
    const fileId = c.req.param('fileId');

    // We need to find the file across all content
    // This is less efficient but provides backward compatibility
    const allKeys = await kv.getByPrefix('content_');
    
    for (const item of allKeys) {
      if (item.key.startsWith('content_')) {
        const content = item.value;
        let fileToDelete = null;
        let found = false;
        let updatedContent = { ...content };

        // Check in previousYearPapers
        for (const paper of content.previousYearPapers || []) {
          if (paper.id === fileId) {
            fileToDelete = paper;
            updatedContent.previousYearPapers = content.previousYearPapers.filter((p: any) => p.id !== fileId);
            found = true;
            break;
          }
        }

        // Check in iaPapers
        if (!found) {
          for (const paper of content.iaPapers || []) {
            if (paper.id === fileId) {
              fileToDelete = paper;
              updatedContent.iaPapers = content.iaPapers.filter((p: any) => p.id !== fileId);
              found = true;
              break;
            }
          }
        }

        // Check in notes
        if (!found && content.notes) {
          for (const module of Object.keys(content.notes)) {
            for (const note of content.notes[module] || []) {
              if (note.id === fileId) {
                fileToDelete = note;
                updatedContent.notes[module] = content.notes[module].filter((n: any) => n.id !== fileId);
                found = true;
                break;
              }
            }
            if (found) break;
          }
        }

        if (found && fileToDelete) {
          // Delete from storage
          const { error } = await supabase.storage
            .from('make-fd1978ca-documents')
            .remove([fileToDelete.path]);

          if (error) {
            console.error('Error deleting file from storage:', error);
          }

          // Update content
          await kv.set(item.key, updatedContent);
          return c.json({ message: 'File deleted successfully' });
        }
      }
    }

    return c.json({ error: 'File not found' }, 404);
  } catch (error) {
    console.error('Delete file server error:', error);
    return c.json({ error: 'Internal server error during file deletion' }, 500);
  }
});

// Delete file (admin only)
app.delete("/make-server-fd1978ca/admin/delete/:department/:semester/:subject/:fileId", requireAuth, async (c) => {
  try {
    const department = c.req.param('department');
    const semester = c.req.param('semester');
    const subject = c.req.param('subject');
    const fileId = c.req.param('fileId');

    const contentKey = `content_${department}_${semester}_${subject}`;
    const content = await kv.get(contentKey);
    
    if (!content) {
      return c.json({ error: 'Content not found' }, 404);
    }

    let fileToDelete = null;
    let found = false;

    // Find and remove the file from the appropriate array
    for (const paper of content.previousYearPapers) {
      if (paper.id === fileId) {
        fileToDelete = paper;
        content.previousYearPapers = content.previousYearPapers.filter((p: any) => p.id !== fileId);
        found = true;
        break;
      }
    }

    if (!found) {
      for (const paper of content.iaPapers) {
        if (paper.id === fileId) {
          fileToDelete = paper;
          content.iaPapers = content.iaPapers.filter((p: any) => p.id !== fileId);
          found = true;
          break;
        }
      }
    }

    if (!found) {
      for (const module of Object.keys(content.notes)) {
        for (const note of content.notes[module]) {
          if (note.id === fileId) {
            fileToDelete = note;
            content.notes[module] = content.notes[module].filter((n: any) => n.id !== fileId);
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }

    if (!found || !fileToDelete) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Delete from storage
    const { error } = await supabase.storage
      .from('make-fd1978ca-documents')
      .remove([fileToDelete.path]);

    if (error) {
      console.error('Error deleting file from storage:', error);
    }

    // Update content
    await kv.set(contentKey, content);

    return c.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file server error:', error);
    return c.json({ error: 'Internal server error during file deletion' }, 500);
  }
});

Deno.serve(app.fetch);