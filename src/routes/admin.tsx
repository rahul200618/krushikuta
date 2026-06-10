import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHero } from "@/components/site/PageHero";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { services } from "@/lib/site-data";
import { CheckCircle2, Circle, Trash2, Plus, FileText, Trophy, Settings, Search, Filter, X, Edit3, Image as ImageIcon, Loader2, MessageSquare } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ExamEditorPanel } from "@/components/exam/ExamEditorPanel";
import { AccessManagerPanel } from "@/components/exam/AccessManagerPanel";
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin Dashboard — Krishikuta" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activePopupIdx, setActivePopupIdx] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);

  // Search and Filter States
  const [regSearch, setRegSearch] = useState("");
  const [regFilter, setRegFilter] = useState("all");
  const [inqSearch, setInqSearch] = useState("");
  const [blogSearch, setBlogSearch] = useState("");
  const [resSearch, setResSearch] = useState("");
  const [testSearch, setTestSearch] = useState("");

  const [blogDialogOpen, setBlogDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [editingResult, setEditingResult] = useState<any>(null);
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsLoggedIn(true);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    const fetchPopupStatus = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('id, value')
        .like('id', 'popup_%');
        
      if (data && data.length > 0) {
        const active = data.find(d => d.value === true || d.value === "true" || d.value === 1);
        if (active) {
          const idx = parseInt(active.id.split('_')[1]);
          setActivePopupIdx(!isNaN(idx) && idx >= 0 ? idx : -1);
        } else {
          setActivePopupIdx(-1);
        }
      } else {
        setActivePopupIdx(-1);
      }
    };
    
    fetchPopupStatus();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      const fetchData = async () => {
        const { data: regData } = await supabase.from('registrations').select('*').order('created_at', { ascending: false });
        if (regData) setRegistrations(regData);
        
        const { data: inqData } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false });
        if (inqData) setInquiries(inqData);

        const { data: blogData } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
        if (blogData) setBlogs(blogData);

        const { data: resData } = await supabase.from('results').select('*').order('created_at', { ascending: false });
        if (resData) setResults(resData);
        
        const { data: testData } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false });
        if (testData) setTestimonials(testData);
      };
      fetchData();
    }
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoginError(error.message);
    } else {
      setIsLoggedIn(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to WebP with 0.6 quality (very high compression, low KB)
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Canvas to Blob failed"));
            },
            "image/webp",
            0.6
          );
        };
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      // Compress the image before uploading
      const compressedBlob = await compressImage(file);
      const fileName = `${Math.random().toString(36).substring(2)}.webp`;
      const filePath = `blog-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public1')
        .upload(filePath, compressedBlob, {
          contentType: 'image/webp'
        });

      if (uploadError) {
        if (uploadError.message.includes("Bucket not found")) {
          alert("Error: Storage bucket 'public1' not found. Please create a public bucket named 'public1' in your Supabase dashboard.");
        } else {
          alert("Error uploading image: " + uploadError.message);
        }
        return null;
      }

      const { data } = supabase.storage.from('public1').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      console.error(err);
      alert("Compression or Upload failed. Try a smaller file.");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const selectPopup = async (idx: number) => {
    setIsSaving(true);
    const updates = Array.from({ length: services.length }).map((_, i) => ({
      id: `popup_${i}`,
      value: idx === -1 ? false : (i === idx ? true : false)
    }));
    
    const { error } = await supabase.from('site_settings').upsert(updates, { onConflict: 'id' });
    
    setIsSaving(false);
    
    if (error) {
      alert(`Error updating settings: ${error.message} (Code: ${error.code}). Check RLS policies.`);
      return;
    }
    
    setActivePopupIdx(idx); 
    window.dispatchEvent(new CustomEvent("servicesPopupSelected", { detail: { idx: idx === -1 ? null : idx } }));
  };

  const deleteRecord = async (table: string, id: string) => {
    setConfirmDialog({
      open: true,
      title: "Delete Record",
      description: "Are you sure you want to delete this record? This action cannot be undone.",
      onConfirm: async () => {
        const { error } = await supabase.from(table).delete().eq('id', id);
        
        if (error) {
          alert(`Error deleting record: ${error.message} (Code: ${error.code}). Check your Supabase RLS policies for the '${table}' table to ensure DELETE operations are allowed.`);
          return;
        }

        if (table === 'registrations') setRegistrations(registrations.filter(r => r.id !== id));
        if (table === 'inquiries') setInquiries(inquiries.filter(i => i.id !== id));
        if (table === 'blogs') setBlogs(blogs.filter(b => b.id !== id));
        if (table === 'results') setResults(results.filter(r => r.id !== id));
        if (table === 'testimonials') setTestimonials(testimonials.filter(t => t.id !== id));
      }
    });
  };

  const handleUpsertBlog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const id = editingBlog?.id;
    
    setConfirmDialog({
      open: true,
      title: id ? "Confirm Update" : "Confirm Addition",
      description: id ? "Are you sure you want to update this blog post?" : "Are you sure you want to publish this new blog post?",
      onConfirm: async () => {
        const data: any = {
          title: formData.get('title'),
          slug: formData.get('slug') || (formData.get('title') as string).toLowerCase().replace(/ /g, '-'),
          excerpt: formData.get('excerpt'),
          content: formData.get('content'),
          read_time: formData.get('read_time') || '5 min read',
          image_url: formData.get('image_url') || editingBlog?.image_url || ''
        };

        if (!id) {
           data.date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        const { data: savedBlog, error } = id 
          ? await supabase.from('blogs').update(data).eq('id', id).select()
          : await supabase.from('blogs').insert([data]).select();

        if (error) {
          alert("Error saving blog: " + error.message);
        } else if (savedBlog) {
          if (id) {
            setBlogs(blogs.map(b => b.id === id ? savedBlog[0] : b));
          } else {
            setBlogs([savedBlog[0], ...blogs]);
          }
          setBlogDialogOpen(false);
          setEditingBlog(null);
        }
      }
    });
  };

  const handleUpsertResult = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const id = editingResult?.id;
    
    setConfirmDialog({
      open: true,
      title: id ? "Confirm Update" : "Confirm Addition",
      description: id ? "Are you sure you want to update this result?" : "Are you sure you want to add this result?",
      onConfirm: async () => {
        const data = {
          student_name: formData.get('student_name'),
          exam_name: formData.get('exam_name'),
          year: formData.get('year') || new Date().getFullYear().toString(),
          image_url: formData.get('image_url') || editingResult?.image_url || '',
        };

        const { data: savedRes, error } = id
          ? await supabase.from('results').update(data).eq('id', id).select()
          : await supabase.from('results').insert([data]).select();

        if (error) {
          alert("Error saving result: " + error.message);
        } else if (savedRes) {
          if (id) {
            setResults(results.map(r => r.id === id ? savedRes[0] : r));
          } else {
            setResults([savedRes[0], ...results]);
          }
          setResultDialogOpen(false);
          setEditingResult(null);
        }
      }
    });
  };

  const handleUpsertTestimonial = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const id = editingTestimonial?.id;
    
    setConfirmDialog({
      open: true,
      title: id ? "Confirm Update" : "Confirm Addition",
      description: id ? "Are you sure you want to update this testimonial?" : "Are you sure you want to add this testimonial?",
      onConfirm: async () => {
        const data = {
          student_name: formData.get('student_name'),
          program: formData.get('program'),
          content: formData.get('content'),
          image_url: formData.get('image_url') || editingTestimonial?.image_url || '',
        };

        const { data: savedTest, error } = id
          ? await supabase.from('testimonials').update(data).eq('id', id).select()
          : await supabase.from('testimonials').insert([data]).select();

        if (error) {
          alert("Error saving testimonial: " + error.message);
        } else if (savedTest) {
          if (id) {
            setTestimonials(testimonials.map(t => t.id === id ? savedTest[0] : t));
          } else {
            setTestimonials([savedTest[0], ...testimonials]);
          }
          setTestDialogOpen(false);
          setEditingTestimonial(null);
        }
      }
    });
  };

  // Filter Logic
  const filteredRegistrations = registrations.filter(r => {
    const matchesSearch = r.full_name?.toLowerCase().includes(regSearch.toLowerCase()) || 
                         r.email?.toLowerCase().includes(regSearch.toLowerCase()) ||
                         r.phone?.includes(regSearch);
    const matchesFilter = regFilter === "all" || r.service_slug === regFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredInquiries = inquiries.filter(i => 
    i.full_name?.toLowerCase().includes(inqSearch.toLowerCase()) || 
    i.email?.toLowerCase().includes(inqSearch.toLowerCase()) ||
    i.interest?.toLowerCase().includes(inqSearch.toLowerCase())
  );

  const filteredBlogs = blogs.filter(b => b.title?.toLowerCase().includes(blogSearch.toLowerCase()));
  
  const filteredResults = results.filter(r => 
    r.student_name?.toLowerCase().includes(resSearch.toLowerCase()) || 
    r.exam_name?.toLowerCase().includes(resSearch.toLowerCase())
  );

  const filteredTestimonials = testimonials.filter(t => 
    t.student_name?.toLowerCase().includes(testSearch.toLowerCase()) || 
    t.program?.toLowerCase().includes(testSearch.toLowerCase()) ||
    t.content?.toLowerCase().includes(testSearch.toLowerCase())
  );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 border-border shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-primary-foreground animate-spin-slow" />
            </div>
            <h1 className="text-2xl font-bold">Admin Portal</h1>
            <p className="text-muted-foreground mt-2">Manage your institution dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@krishikuta.com" required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {loginError && <p className="text-sm text-red-500">{loginError}</p>}
            <Button type="submit" className="w-full gradient-primary">Secure Login</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <>
      <PageHero eyebrow="Admin" title="Dashboard" description="Content management and lead tracking system." />
      <div className="section-padding container-px mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight">Management Suite</h2>
          <Button variant="outline" onClick={handleLogout} className="rounded-full">Log Out</Button>
        </div>
        
        <Tabs defaultValue="leads" className="w-full">
          <TabsList className="mb-8 p-1 bg-muted/50 rounded-2xl inline-flex w-full overflow-x-auto h-auto scrollbar-hide">
            <TabsTrigger value="leads" className="rounded-xl py-3 px-6 text-sm font-medium">Registrations</TabsTrigger>
            <TabsTrigger value="inquiries" className="rounded-xl py-3 px-6 text-sm font-medium">Inquiries</TabsTrigger>
            <TabsTrigger value="blog" className="rounded-xl py-3 px-6 text-sm font-medium">Blog Posts</TabsTrigger>
            <TabsTrigger value="results" className="rounded-xl py-3 px-6 text-sm font-medium">Results</TabsTrigger>
            <TabsTrigger value="testimonials" className="rounded-xl py-3 px-6 text-sm font-medium">Testimonials</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl py-3 px-6 text-sm font-medium">Popups</TabsTrigger>
            <TabsTrigger value="mock-tests" className="rounded-xl py-3 px-6 text-sm font-medium">Exam Portal</TabsTrigger>
            <TabsTrigger value="exam-access" className="rounded-xl py-3 px-6 text-sm font-medium">Exam Access</TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={regSearch} onChange={(e) => setRegSearch(e.target.value)} className="pl-10 rounded-xl bg-card" placeholder="Search by name, email or phone..." />
                {regSearch && <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground cursor-pointer" onClick={() => setRegSearch("")} />}
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={regFilter} onValueChange={setRegFilter}>
                  <SelectTrigger className="w-[200px] rounded-xl bg-card">
                    <SelectValue placeholder="All Services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {services.map(s => <SelectItem key={s.slug} value={s.slug}>{s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Card className="p-0 border-border overflow-hidden shadow-sm">
              <div className="p-6 border-b bg-muted/10">
                <h3 className="font-bold flex items-center gap-2">Program Registrations ({filteredRegistrations.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold tracking-widest">
                    <tr><th className="px-6 py-4 text-left">Date</th><th className="px-6 py-4 text-left">Name</th><th className="px-6 py-4 text-left">Contact</th><th className="px-6 py-4 text-left">Program</th><th className="px-6 py-4 text-center">Action</th></tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.length > 0 ? filteredRegistrations.map(r => (
                      <tr key={r.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-semibold whitespace-nowrap">{r.full_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><div>{r.phone}</div><div className="text-xs text-muted-foreground">{r.email}</div></td>
                        <td className="px-6 py-4"><span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs whitespace-nowrap">{services.find(s=>s.slug===r.service_slug)?.title || r.service_slug}</span></td>
                        <td className="px-6 py-4 text-center"><Button variant="ghost" size="icon" onClick={()=>deleteRecord('registrations',r.id)} className="text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4"/></Button></td>
                      </tr>
                    )) : <tr><td colSpan={5} className="py-20 text-center text-muted-foreground">No registrations found matching your filters.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="inquiries">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={inqSearch} onChange={(e) => setInqSearch(e.target.value)} className="pl-10 rounded-xl bg-card" placeholder="Search inquiries by name or email..." />
            </div>
            <Card className="p-0 border-border overflow-hidden shadow-sm">
              <div className="p-6 border-b bg-muted/10">
                <h3 className="font-bold">Contact Inquiries ({filteredInquiries.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold tracking-widest">
                    <tr><th className="px-6 py-4 text-left">Date</th><th className="px-6 py-4 text-left">Name</th><th className="px-6 py-4 text-left">Contact</th><th className="px-6 py-4 text-left">Interest</th><th className="px-6 py-4 text-center">Action</th></tr>
                  </thead>
                  <tbody>
                    {filteredInquiries.length > 0 ? filteredInquiries.map(i => (
                      <tr key={i.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-xs whitespace-nowrap">{new Date(i.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-semibold whitespace-nowrap">{i.full_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><div>{i.phone}</div><div className="text-xs text-muted-foreground">{i.email}</div></td>
                        <td className="px-6 py-4 text-xs">{i.interest}</td>
                        <td className="px-6 py-4 text-center"><Button variant="ghost" size="icon" onClick={()=>deleteRecord('inquiries',i.id)} className="text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4"/></Button></td>
                      </tr>
                    )) : <tr><td colSpan={5} className="py-20 text-center text-muted-foreground">No inquiries found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="blog">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={blogSearch} onChange={(e) => setBlogSearch(e.target.value)} className="pl-10 rounded-xl bg-card" placeholder="Search blog titles..." />
              </div>
              <Dialog open={blogDialogOpen} onOpenChange={(open) => { setBlogDialogOpen(open); if(!open) setEditingBlog(null); }}>
                <DialogTrigger asChild><Button className="gradient-primary w-full md:w-auto"><Plus className="w-4 h-4 mr-2" /> New Post</Button></DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingBlog ? "Edit Blog Post" : "Create New Blog Post"}</DialogTitle>
                    <DialogDescription>
                      Fill in the details below to {editingBlog ? "update the existing" : "publish a new"} blog post.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpsertBlog} className="space-y-4 pt-4">
                    <div className="grid gap-2"><Label>Title</Label><Input name="title" defaultValue={editingBlog?.title} placeholder="Why Agriculture is the Future..." required /></div>
                    <div className="grid gap-2"><Label>Slug (optional)</Label><Input name="slug" defaultValue={editingBlog?.slug} placeholder="agriculture-future" /></div>
                    <div className="grid gap-2"><Label>Excerpt (Brief summary)</Label><Input name="excerpt" defaultValue={editingBlog?.excerpt} placeholder="Agriculture is evolving with technology..." /></div>
                    <div className="grid gap-2"><Label>Read Time</Label><Input name="read_time" defaultValue={editingBlog?.read_time} placeholder="5 min read" /></div>
                    <div className="grid gap-2">
                       <Label>Cover Image</Label>
                       <div className="flex gap-2">
                         <Input name="image_url" id="blog_image_url" defaultValue={editingBlog?.image_url} placeholder="https://example.com/image.jpg" className="flex-1" />
                         <div className="relative">
                            <Button type="button" variant="outline" className="relative overflow-hidden">
                              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                              Upload
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const url = await uploadImage(file);
                                    if (url) {
                                      const input = document.getElementById('blog_image_url') as HTMLInputElement;
                                      if (input) input.value = url;
                                    }
                                  }
                                }}
                              />
                            </Button>
                         </div>
                       </div>
                    </div>
                    <div className="grid gap-2"><Label>Full Content (HTML allowed)</Label><Textarea name="content" defaultValue={editingBlog?.content} className="min-h-[200px]" placeholder="Start writing..." /></div>
                    <Button type="submit" className="w-full">{editingBlog ? "Update Post" : "Publish Post"}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid gap-4">
              {filteredBlogs.length > 0 ? filteredBlogs.map(b => (
                <Card key={b.id} className="p-4 border-border flex items-center justify-between hover:shadow-soft transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                      {b.image_url ? (
                        <img 
                          src={b.image_url} 
                          alt={b.title}
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const icon = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                            if (icon) icon.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <FileText 
                        className="w-6 h-6 text-primary" 
                        style={{ display: b.image_url ? 'none' : 'block' }} 
                      />
                    </div>
                    <div><h4 className="font-bold">{b.title}</h4><p className="text-xs text-muted-foreground">{b.date} • {b.read_time}</p></div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingBlog(b); setBlogDialogOpen(true); }} className="text-primary"><Edit3 className="w-4 h-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={()=>deleteRecord('blogs',b.id)} className="text-destructive"><Trash2 className="w-4 h-4"/></Button>
                  </div>
                </Card>
              )) : <div className="text-center py-20 text-muted-foreground border border-dashed rounded-2xl">No blog posts found matching your search.</div>}
            </div>
          </TabsContent>

          <TabsContent value="results">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={resSearch} onChange={(e) => setResSearch(e.target.value)} className="pl-10 rounded-xl bg-card" placeholder="Search student name or exam..." />
              </div>
              <Dialog open={resultDialogOpen} onOpenChange={(open) => { setResultDialogOpen(open); if(!open) setEditingResult(null); }}>
                <DialogTrigger asChild><Button className="gradient-gold text-gold-foreground w-full md:w-auto"><Plus className="w-4 h-4 mr-2" /> Add Result</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingResult ? "Edit Result" : "New Result Entry"}</DialogTitle>
                    <DialogDescription>
                      Enter the student's achievement details for the results showcase.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpsertResult} className="space-y-4 pt-4">
                    <div className="grid gap-2"><Label>Student Name</Label><Input name="student_name" defaultValue={editingResult?.student_name} placeholder="John Smith" required /></div>
                    <div className="grid gap-2"><Label>Exam / Achievement</Label><Input name="exam_name" defaultValue={editingResult?.exam_name} placeholder="Agriculture Officer" required /></div>
                    <div className="grid gap-2"><Label>Year</Label><Input name="year" defaultValue={editingResult?.year} placeholder="2024" /></div>
                    <div className="grid gap-2">
                       <Label>Student Photo</Label>
                       <div className="flex gap-2">
                         <Input name="image_url" id="result_image_url" defaultValue={editingResult?.image_url} placeholder="https://example.com/student.jpg" className="flex-1" />
                         <div className="relative">
                            <Button type="button" variant="outline" className="relative overflow-hidden">
                              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                              Upload
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const url = await uploadImage(file);
                                    if (url) {
                                      const input = document.getElementById('result_image_url') as HTMLInputElement;
                                      if (input) input.value = url;
                                    }
                                  }
                                }}
                              />
                            </Button>
                         </div>
                       </div>
                    </div>
                    <Button type="submit" className="w-full gradient-gold text-gold-foreground">{editingResult ? "Update Result" : "Upload Result"}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResults.length > 0 ? filteredResults.map(r => (
                <Card key={r.id} className="p-4 border-border flex items-center justify-between hover:shadow-soft transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                      {r.image_url ? (
                        <img 
                          src={r.image_url} 
                          alt={r.student_name}
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const icon = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                            if (icon) icon.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <Trophy 
                        className="w-5 h-5 text-gold" 
                        style={{ display: r.image_url ? 'none' : 'block' }} 
                      />
                    </div>
                    <div><div className="font-bold text-sm">{r.student_name}</div><div className="text-[10px] text-muted-foreground uppercase">{r.exam_name} • {r.year}</div></div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingResult(r); setResultDialogOpen(true); }} className="text-primary"><Edit3 className="w-4 h-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={()=>deleteRecord('results',r.id)} className="text-destructive"><Trash2 className="w-4 h-4"/></Button>
                  </div>
                </Card>
              )) : <div className="col-span-full text-center py-20 text-muted-foreground border border-dashed rounded-2xl">No results found.</div>}
            </div>
          </TabsContent>

          <TabsContent value="testimonials">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={testSearch} onChange={(e) => setTestSearch(e.target.value)} className="pl-10 rounded-xl bg-card" placeholder="Search testimonials..." />
              </div>
              <Dialog open={testDialogOpen} onOpenChange={(open) => { setTestDialogOpen(open); if(!open) setEditingTestimonial(null); }}>
                <DialogTrigger asChild><Button className="gradient-primary w-full md:w-auto"><Plus className="w-4 h-4 mr-2" /> Add Testimonial</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingTestimonial ? "Edit Testimonial" : "New Testimonial"}</DialogTitle>
                    <DialogDescription>
                      Enter the student's review and details.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpsertTestimonial} className="space-y-4 pt-4">
                    <div className="grid gap-2"><Label>Student Name</Label><Input name="student_name" defaultValue={editingTestimonial?.student_name} placeholder="John Doe" required /></div>
                    <div className="grid gap-2"><Label>Program / Course</Label><Input name="program" defaultValue={editingTestimonial?.program} placeholder="Agriculture Officer Coaching" required /></div>
                    <div className="grid gap-2"><Label>Testimonial Content</Label><Textarea name="content" defaultValue={editingTestimonial?.content} placeholder="The coaching was excellent..." required className="min-h-[100px]" /></div>
                    <div className="grid gap-2">
                       <Label>Student Photo (Optional)</Label>
                       <div className="flex gap-2">
                         <Input name="image_url" id="test_image_url" defaultValue={editingTestimonial?.image_url} placeholder="https://example.com/student.jpg" className="flex-1" />
                         <div className="relative">
                            <Button type="button" variant="outline" className="relative overflow-hidden">
                              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                              Upload
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const url = await uploadImage(file);
                                    if (url) {
                                      const input = document.getElementById('test_image_url') as HTMLInputElement;
                                      if (input) input.value = url;
                                    }
                                  }
                                }}
                              />
                            </Button>
                         </div>
                       </div>
                    </div>
                    <Button type="submit" className="w-full gradient-primary">{editingTestimonial ? "Update Testimonial" : "Save Testimonial"}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredTestimonials.length > 0 ? filteredTestimonials.map(t => (
                <Card key={t.id} className="p-4 border-border flex flex-col justify-between hover:shadow-soft transition-all h-full">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                        {t.image_url ? (
                          <img 
                            src={t.image_url} 
                            alt={t.student_name}
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const icon = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                              if (icon) icon.style.display = 'block';
                            }}
                          />
                        ) : null}
                        <MessageSquare 
                          className="w-5 h-5 text-primary" 
                          style={{ display: t.image_url ? 'none' : 'block' }} 
                        />
                      </div>
                      <div>
                        <div className="font-bold text-sm">{t.student_name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{t.program}</div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground italic line-clamp-3">"{t.content}"</p>
                  </div>
                  <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-border">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingTestimonial(t); setTestDialogOpen(true); }} className="text-primary"><Edit3 className="w-4 h-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={()=>deleteRecord('testimonials',t.id)} className="text-destructive"><Trash2 className="w-4 h-4"/></Button>
                  </div>
                </Card>
              )) : <div className="col-span-full text-center py-20 text-muted-foreground border border-dashed rounded-2xl">No testimonials found.</div>}
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-6 border-border shadow-sm">
              <h3 className="text-lg font-bold mb-4">Homepage Popup Control</h3>
              <p className="text-sm text-muted-foreground mb-6">Select which service ad to display globally on the homepage.</p>
              <div className="space-y-3">
                <div onClick={() => selectPopup(-1)} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${activePopupIdx === -1 ? 'border-primary bg-primary/5 shadow-soft' : 'border-border hover:border-primary/50'}`}>
                  {activePopupIdx === -1 ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />}
                  <div className="font-medium">Deactivate All Popups</div>
                </div>
                {services.map((s, i) => (
                  <div key={i} onClick={() => selectPopup(i)} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${activePopupIdx === i ? 'border-primary bg-primary/5 shadow-soft' : 'border-border hover:border-primary/50'}`}>
                    {activePopupIdx === i ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />}
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0 shadow-soft"><s.icon className="w-5 h-5 text-primary-foreground" /></div>
                    <div><div className="font-medium">{s.title}</div><div className="text-xs text-muted-foreground line-clamp-1">{s.desc}</div></div>
                  </div>
                ))}
              </div>
              {isSaving && <div className="mt-4 text-xs font-bold text-primary animate-pulse flex items-center gap-2"><Settings className="w-3 h-3 animate-spin" /> Syncing change to global database...</div>}
            </Card>
          </TabsContent>

          <TabsContent value="mock-tests">
            <ExamEditorPanel />
          </TabsContent>

          <TabsContent value="exam-access">
            <AccessManagerPanel />
          </TabsContent>
        </Tabs>
      </div>
      
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              confirmDialog.onConfirm();
              setConfirmDialog(prev => ({ ...prev, open: false }));
            }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
