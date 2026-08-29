-- Keep Listing.searchVector in sync automatically. This is intentionally not
-- expressed in schema.prisma (Prisma has no "generated column"/trigger DSL);
-- it lives only in migration SQL, so `prisma migrate dev` will never see it
-- as drift and try to revert it.

CREATE FUNCTION listing_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."description", '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(coalesce(NEW."tags", ARRAY[]::text[]), ' ')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER listing_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "title", "description", "tags" ON "Listing"
  FOR EACH ROW EXECUTE FUNCTION listing_search_vector_update();
