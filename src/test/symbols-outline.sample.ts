/** Shared ABL sample for outline/symbol tests. */
export const OUTLINE_SAMPLE = `
{include/shared.i}
using OpenEdge.Net.HTTP.

procedure proc1:
  define variable i as integer no-undo.
  define temp-table tt field f as character.
  myBlock:
  do i = 1 to 10:
    message i.
  end.
end procedure.

class Foo:
  define property pName as character get. set.
  method public void bar ():
    return.
  end method.
end class.
`;
