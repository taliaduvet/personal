import { TaskWorkView } from "@/components/TaskWorkView";

export default async function TaskWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TaskWorkView taskId={id} />;
}
