import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/Brand";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="paper-texture flex min-h-screen flex-col"
    >
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <Brand />
        <div className="mt-10 text-center">
          <p className="eyebrow text-muted-foreground">Page not found</p>
          <h1 className="display mt-3 text-6xl font-semibold">404</h1>
          <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
            There is no page at this address. It may have been withdrawn for the
            term, or the link may have aged out.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link to="/">Back to the front page</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/catalog">Browse the catalog</Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
