CREATE TYPE public.plan_document_status AS ENUM ('draft', 'finalized', 'archived');

CREATE TABLE public.agenda_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status public.plan_document_status DEFAULT 'draft' NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_agenda_per_meeting UNIQUE (meeting_id)
);

CREATE TABLE public.agenda_objectives (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agenda_document_id uuid NOT NULL REFERENCES public.agenda_documents(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.agenda_discussion_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agenda_document_id uuid NOT NULL REFERENCES public.agenda_documents(id) ON DELETE CASCADE,
  topic text NOT NULL,
  estimated_time integer NOT NULL DEFAULT 5,
  notes text,
  order_index integer NOT NULL DEFAULT 0,
  status text DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'in_progress', 'completed', 'deferred')),
  catalog_item_id uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.agenda_discussion_tasks (
  agenda_discussion_item_id uuid NOT NULL REFERENCES public.agenda_discussion_items(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (agenda_discussion_item_id, task_id)
);

CREATE INDEX idx_agenda_documents_workspace ON public.agenda_documents(workspace_id);
CREATE INDEX idx_agenda_objectives_document ON public.agenda_objectives(agenda_document_id, order_index);
CREATE INDEX idx_agenda_discussion_items_document ON public.agenda_discussion_items(agenda_document_id, order_index);
CREATE INDEX idx_agenda_discussion_tasks_task ON public.agenda_discussion_tasks(task_id);

CREATE TRIGGER update_agenda_documents_updated_at
  BEFORE UPDATE ON public.agenda_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agenda_objectives_updated_at
  BEFORE UPDATE ON public.agenda_objectives
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agenda_discussion_items_updated_at
  BEFORE UPDATE ON public.agenda_discussion_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.agenda_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_discussion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_discussion_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agenda documents in their workspace"
  ON public.agenda_documents
  FOR SELECT
  USING (workspace_id = public.get_auth_workspace_id());

CREATE POLICY "Leaders and admins can create agenda documents"
  ON public.agenda_documents
  FOR INSERT
  WITH CHECK (
    workspace_id = public.get_auth_workspace_id()
    AND public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
  );

CREATE POLICY "Leaders and admins can update agenda documents"
  ON public.agenda_documents
  FOR UPDATE
  USING (
    workspace_id = public.get_auth_workspace_id()
    AND public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
  );

CREATE POLICY "Leaders and admins can delete agenda documents"
  ON public.agenda_documents
  FOR DELETE
  USING (
    workspace_id = public.get_auth_workspace_id()
    AND public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
  );

CREATE POLICY "Users can view agenda objectives through agenda documents"
  ON public.agenda_objectives
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.agenda_documents ad
      WHERE ad.id = agenda_document_id
        AND ad.workspace_id = public.get_auth_workspace_id()
    )
  );

CREATE POLICY "Leaders and admins can manage agenda objectives"
  ON public.agenda_objectives
  USING (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND EXISTS (
      SELECT 1
      FROM public.agenda_documents ad
      WHERE ad.id = agenda_document_id
        AND ad.workspace_id = public.get_auth_workspace_id()
    )
  )
  WITH CHECK (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND EXISTS (
      SELECT 1
      FROM public.agenda_documents ad
      WHERE ad.id = agenda_document_id
        AND ad.workspace_id = public.get_auth_workspace_id()
    )
  );

CREATE POLICY "Users can view agenda discussion items through agenda documents"
  ON public.agenda_discussion_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.agenda_documents ad
      WHERE ad.id = agenda_document_id
        AND ad.workspace_id = public.get_auth_workspace_id()
    )
  );

CREATE POLICY "Leaders and admins can manage agenda discussion items"
  ON public.agenda_discussion_items
  USING (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND EXISTS (
      SELECT 1
      FROM public.agenda_documents ad
      WHERE ad.id = agenda_document_id
        AND ad.workspace_id = public.get_auth_workspace_id()
    )
  )
  WITH CHECK (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND EXISTS (
      SELECT 1
      FROM public.agenda_documents ad
      WHERE ad.id = agenda_document_id
        AND ad.workspace_id = public.get_auth_workspace_id()
    )
  );

CREATE POLICY "Users can view agenda discussion tasks through parent items"
  ON public.agenda_discussion_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.agenda_discussion_items adi
      JOIN public.agenda_documents ad ON ad.id = adi.agenda_document_id
      WHERE adi.id = agenda_discussion_item_id
        AND ad.workspace_id = public.get_auth_workspace_id()
    )
  );

CREATE POLICY "Leaders and admins can manage agenda discussion tasks"
  ON public.agenda_discussion_tasks
  USING (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND EXISTS (
      SELECT 1
      FROM public.agenda_discussion_items adi
      JOIN public.agenda_documents ad ON ad.id = adi.agenda_document_id
      WHERE adi.id = agenda_discussion_item_id
        AND ad.workspace_id = public.get_auth_workspace_id()
    )
  )
  WITH CHECK (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND EXISTS (
      SELECT 1
      FROM public.agenda_discussion_items adi
      JOIN public.agenda_documents ad ON ad.id = adi.agenda_document_id
      WHERE adi.id = agenda_discussion_item_id
        AND ad.workspace_id = public.get_auth_workspace_id()
    )
  );
