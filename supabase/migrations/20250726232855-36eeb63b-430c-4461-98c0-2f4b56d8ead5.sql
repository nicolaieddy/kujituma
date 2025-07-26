-- Create trigger to handle mentions after comment insertion
CREATE TRIGGER handle_comment_mentions_trigger
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_mentions();